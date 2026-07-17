from __future__ import annotations

import json
import random
from datetime import datetime, date, timedelta

import frappe
from frappe import _
from frappe.utils import now_datetime, get_datetime, getdate, today, cint, flt
from .settings_contract import SETTINGS_FIELDS, get_supported_settings_fields, normalize_settings_update
from .gallery_mapping import is_gallery_image_file, plan_gallery_scope
from .dashboard_home import (
    build_finance_snapshot,
    build_summary_metrics,
    select_agenda,
    select_focus_goal,
    select_priority_item,
)


DONE_TASK_STATUSES = {"done", "انجام‌شده"}
ACTIVE_GOAL_STATUSES = {"active", "فعال"}
DONE_HABIT_STATUSES = {"done", "انجام‌شده"}

# Priority normalization: English -> Persian for Hambaft Task child table
_PRIORITY_EN_TO_FA = {
    "low": "پایین", "medium": "متوسط", "high": "بالا", "urgent": "فوری",
    "پایین": "پایین", "متوسط": "متوسط", "بالا": "بالا", "فوری": "فوری",
    "کم": "پایین", "زیاد": "بالا", "حیاتی": "فوری",
}
_VALID_TASK_PRIORITIES = {"پایین", "متوسط", "بالا", "فوری"}

# Valid Task status values per DocType Select field
_VALID_TASK_STATUSES = {"inbox", "not_started", "next", "today", "in_progress", "done", "on_hold", "someday", "dropped"}
_STATUS_FA_TO_EN = {
    "صندوق ورودی": "inbox", "ورودی": "inbox",
    "امروز": "today",
    "بعدی": "next",
    "در حال انجام": "in_progress",
    "انجام‌شده": "done", "انجام شده": "done", "تکمیل‌شده": "done", "completed": "done",
    "متوقف": "on_hold",
    "شاید": "someday", "روزی": "someday",
    "انجام‌نشده": "not_started",
    "دورانداخته": "dropped",
}


def _normalize_task_priority(value):
    """Map any priority value to a valid Hambaft Task Persian enum."""
    if not value:
        return "متوسط"
    mapped = _PRIORITY_EN_TO_FA.get(str(value).strip())
    if mapped:
        return mapped
    return "متوسط"


def _normalize_task_status(value):
    """Map any status value to a valid Task DocType Select option."""
    if not value:
        return "inbox"
    v = str(value).strip()
    if v in _VALID_TASK_STATUSES:
        return v
    mapped = _STATUS_FA_TO_EN.get(v)
    if mapped:
        return mapped
    return "inbox"


def _normalize_task_data(data):
    """Sanitize task data before doc.update() to prevent validation errors."""
    if not isinstance(data, dict):
        return data
    # Normalize status to a valid English Select option
    if "status" in data:
        data["status"] = _normalize_task_status(data["status"])
    # Normalize priority to Persian (DocType accepts both, but Persian is canonical)
    if "priority" in data:
        data["priority"] = _normalize_task_priority(data["priority"])
    # Normalize effort_type
    _effort_map = {"fixed": "ثابت", "variable": "متغیر", "ثابت": "ثابت", "متغیر": "متغیر"}
    if "effort_type" in data:
        data["effort_type"] = _effort_map.get(str(data["effort_type"]).strip(), "متغیر")
    # Null out empty Link fields to prevent "does not exist" errors
    for link_field in ("project", "area", "goal", "parent_task"):
        val = data.get(link_field)
        if val is not None and val != "":
            # Reject temp IDs like tk-*, gl-*, ar-*
            if isinstance(val, str) and any(val.startswith(p) for p in ("tk-", "gl-", "ar-", "pr-")):
                data[link_field] = None
        else:
            data[link_field] = None
    return data


def _unwrap_response(value):
    if isinstance(value, dict) and "data" in value and set(value.keys()) <= {"status", "data", "message"}:
        return value["data"]
    return value


def _get_session_csrf_token():
    token = str((getattr(frappe.local, "session", None) and frappe.local.session.data or {}).get("csrf_token") or "").strip()
    if token:
        return token

    try:
        token = str(frappe.sessions.get_csrf_token() or "").strip()
    except Exception:
        token = ""

    if token:
        return token

    token = frappe.generate_hash()
    try:
        frappe.local.session.data.csrf_token = token
    except Exception:
        pass

    try:
        frappe.local.session_obj.update(force=True)
    except Exception:
        pass

    return token


def _priority_rank(value):
    order = {"فوری": 0, "urgent": 0, "بالا": 1, "high": 1, "متوسط": 2, "medium": 2, "پایین": 3, "low": 3}
    return order.get(value, 99)


def _is_open_task(task):
    return task.get("status") not in DONE_TASK_STATUSES


def _is_active_goal(goal):
    return goal.get("status") in ACTIVE_GOAL_STATUSES


def _fetch_tasks_for_day(date_value, limit=50):
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "due_date": ["between", [f"{date_value} 00:00:00", f"{date_value} 23:59:59"]]},
        fields="*",
        limit_page_length=limit,
        order_by="due_date asc",
    )
    return [task for task in tasks if _is_open_task(task)]


def _fetch_done_tasks_for_day(date_value):
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "completed_on": ["between", [f"{date_value} 00:00:00", f"{date_value} 23:59:59"]]},
        fields=["name", "completed_on"],
    )
    return [task for task in tasks if task.get("name")]


def _fetch_active_goals():
    goals = frappe.get_all(
        "Goal",
        filters={"user": frappe.session.user},
        fields="*",
        order_by="target_date asc",
    )
    return [goal for goal in goals if _is_active_goal(goal)]


def _fetch_goal_milestones():
    milestones_by_goal = {}
    goals = _fetch_active_goals()
    for goal in goals:
        rows = frappe.get_all(
            "Hambaft Goal Milestone",
            filters={"parent": goal.name, "parenttype": "Goal"},
            fields="*",
            order_by="target_date asc",
        )
        milestones_by_goal[goal.name] = rows
    return goals, milestones_by_goal


def _fetch_pending_habits(date_value):
    habits = frappe.get_all("Habit", filters={"user": frappe.session.user, "is_active": 1}, fields="*")
    done_habits = frappe.get_all(
        "Habit Log",
        filters={"user": frappe.session.user, "date": date_value},
        fields=["habit", "status"],
    )
    done_habit_names = {
        row.habit if hasattr(row, "habit") else row.get("habit")
        for row in done_habits
        if (row.status if hasattr(row, "status") else row.get("status")) in DONE_HABIT_STATUSES
    }
    return [habit for habit in habits if habit.name not in done_habit_names]


def _fetch_events_for_day(date_value, limit=20):
    return frappe.get_all(
        "Calendar Event",
        filters={"user": frappe.session.user, "starts_at": ["between", [f"{date_value} 00:00:00", f"{date_value} 23:59:59"]]},
        fields="*",
        limit_page_length=limit,
        order_by="starts_at asc",
    )


def _fetch_finance_dependencies():
    budgets = frappe.get_all(
        "Hambaft Budget",
        filters={"user": frappe.session.user},
        fields="*",
        order_by="start_date desc",
    )
    bills = frappe.get_all(
        "Hambaft Bill",
        filters={"user": frappe.session.user, "due_date": [">=", today()]},
        fields="*",
        limit_page_length=10,
        order_by="due_date asc",
    )
    subscriptions = frappe.get_all(
        "Hambaft Subscription",
        filters={"user": frappe.session.user, "next_billing_date": [">=", today()]},
        fields="*",
        limit_page_length=10,
        order_by="next_billing_date asc",
    )
    return budgets, bills, subscriptions


def _water_fieldnames():
    try:
        meta = frappe.get_meta("Water Log")
        return {field.fieldname for field in meta.fields}
    except Exception:
        return set()


def _water_date_field():
    fields = _water_fieldnames()
    return "log_date" if "log_date" in fields else "date"


def _water_note_field():
    fields = _water_fieldnames()
    if "notes" in fields:
        return "notes"
    return "note"


# ─── Auth helpers ───────────────────────────────────────────────

def _check_auth():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    try:
        settings = frappe.db.get_value(
            "Profile Settings",
            {"user": frappe.session.user},
            ["onboarding_completed", "onboarding_step"],
            as_dict=True,
        )
    except Exception:
        settings = None
    return settings


def _owner_filter():
    return {"user": frappe.session.user}

def _require_owner(doctype, name):
    if not frappe.db.exists(doctype, {"name": name, "user": frappe.session.user}):
        frappe.throw(_("Permission denied"), frappe.PermissionError)




def _ensure_settings():
    """Ensure Profile Settings exists for current user."""
    doc = _get_or_create_settings_doc()
    if doc.is_new():
        doc.insert(ignore_permissions=True)
        frappe.db.commit()


def _api_response(data=None, status="success", message=None):
    resp = {"status": status}
    if data is not None:
        resp["data"] = data
    if message:
        resp["message"] = message
    return resp


def _loads_json(value, default):
    if not value:
        return default
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return default


_DONE_STATUSES = {"done", "completed", "انجام‌شده", "انجام شده"}


def _enrich_task_with_impact(task_dict):
    """Add impact-aware fields to a task dict (project/goal context, blocked detail)."""
    task_dict["impact_goal_title"] = None
    task_dict["impact_goal_health"] = None
    task_dict["impact_goal_progress"] = None
    task_dict["impact_project_title"] = None
    task_dict["impact_project_contribution_type"] = None
    task_dict["impact_project_progress"] = None
    task_dict["blocked_by_titles"] = []
    task_dict["blocked_by_statuses"] = {}
    task_dict["impact_score"] = 0

    project_name = task_dict.get("project")
    has_active_goal = False
    project_contribution_weight = 0
    goal_health_penalty = 0
    if project_name:
        proj = frappe.db.get_value(
            "Hambaft Project", project_name,
            ["title", "progress", "goal"], as_dict=True,
        )
        if proj:
            task_dict["impact_project_title"] = proj.title
            task_dict["impact_project_progress"] = proj.progress or 0
            if proj.goal:
                goal = frappe.db.get_value(
                    "Goal", proj.goal,
                    ["name", "title", "health_state", "progress_percent"], as_dict=True,
                )
                if goal:
                    task_dict["impact_goal_title"] = goal.title
                    task_dict["impact_goal_health"] = goal.health_state
                    task_dict["impact_goal_progress"] = goal.progress_percent or 0
                    # contribution_type
                    try:
                        for link in frappe.get_all(
                            "Goal Project Link",
                            filters={"parent": proj.goal, "project": project_name},
                            fields=["contribution_type"], limit=1,
                        ):
                            task_dict["impact_project_contribution_type"] = link.contribution_type
                            break
                    except Exception:
                        pass

    # Also check direct goal link
    goal_name = task_dict.get("goal")
    if goal_name and not task_dict.get("impact_goal_title"):
        goal = frappe.db.get_value(
            "Goal", goal_name,
            ["title", "health_state", "progress_percent"], as_dict=True,
        )
        if goal:
            task_dict["impact_goal_title"] = goal.title
            task_dict["impact_goal_health"] = goal.health_state
            task_dict["impact_goal_progress"] = goal.progress_percent or 0
    blocked_raw = task_dict.get("blocked_by_json")
    blocked = _loads_json(blocked_raw, [])
    if blocked:
        titles = []
        statuses = {}
        for dep_id in blocked:
            dep = frappe.db.get_value("Task", dep_id, ["name", "title", "status"], as_dict=True)
            if dep:
                titles.append(dep.title or dep.name)
                statuses[dep.name] = dep.status
        task_dict["blocked_by_titles"] = titles
        task_dict["blocked_by_statuses"] = statuses

    # ─── Impact Score Computation ────────────────────────────
    # Combines multiple signals into a single actionable score (0-100):
    #   - importance weight: milestone=30, key=20, normal=5
    #   - linked goal bonus: +15 if task belongs to a project linked to an active goal
    #   - contribution type bonus: mandatory=+15, recommended=+8, supporting=+3
    #   - goal health urgency: at_risk=+10, off_track=+15
    #   - unblocking leverage: +10 if this task blocks other tasks
    #   - blocked penalty: -10 if this task is currently blocked
    #   - due urgency: +5 if overdue, +3 if due within 3 days
    importance = task_dict.get("importance", "عادی")
    imp_score = {"نقطه‌عطف": 30, "کلیدی": 20}.get(importance, 5)
    
    goal_score = 0
    if task_dict.get("impact_goal_title"):
        goal_score = 15  # linked to an active goal
        # Health urgency
        health = task_dict.get("impact_goal_health", "")
        if health == "خارج_از_مسیر":
            goal_score += 15
        elif health == "در_خطر":
            goal_score += 10
        elif health == "نیاز_به_بررسی":
            goal_score += 5

    contrib_score = 0
    ct = task_dict.get("impact_project_contribution_type", "")
    if ct == "اجباری":
        contrib_score = 15
    elif ct == "پیشنهادی":
        contrib_score = 8
    elif ct == "پشتیبان":
        contrib_score = 3

    # Unblocking leverage: does this task block others?
    unblock_score = 0
    blocking_raw = task_dict.get("blocking_json")
    blocking_list = _loads_json(blocking_raw, [])
    if blocking_list:
        unblock_score = min(10, len(blocking_list) * 5)  # cap at 10

    # Blocked penalty
    blocked_raw = task_dict.get("blocked_by_json")
    blocked_list = _loads_json(blocked_raw, [])
    blocked_penalty = -10 if blocked_list else 0

    # Due urgency
    due_score = 0
    due_date_str = task_dict.get("due_date")
    if due_date_str:
        try:
            due_d = getdate(due_date_str)
            today_d = getdate(today())
            days_left = (due_d - today_d).days
            if days_left < 0:
                due_score = 5  # overdue
            elif days_left <= 3:
                due_score = 3  # due soon
        except Exception:
            pass

    total_score = min(100, max(0, imp_score + goal_score + contrib_score + unblock_score + blocked_penalty + due_score))
    task_dict["impact_score"] = total_score

    return task_dict


_IMPORTANCE_ORDER = {"نقطه‌عطف": 0, "کلیدی": 1, "عادی": 2}
_PRIORITY_ORDER = {"فوری": 0, "بالا": 1, "متوسط": 2, "پایین": 3, "urgent": 0, "high": 1, "medium": 2, "low": 3}


def _impact_sort_key(task_dict):
    """Sort key: impact_score desc → importance desc → priority desc → due_date asc."""
    # Primary: impact_score descending (negate for ascending sort)
    impact = -task_dict.get("impact_score", 0)
    # Fallback: importance → priority → due_date
    imp = _IMPORTANCE_ORDER.get(task_dict.get("importance", "عادی"), 2)
    pri = _PRIORITY_ORDER.get(task_dict.get("priority", "متوسط"), 2)
    due = task_dict.get("due_date") or "9999-12-31"
    return (impact, imp, pri, due)


def _save_doc(doc):
    if doc.is_new():
        doc.insert(ignore_permissions=True)
    else:
        doc.save(ignore_permissions=True)
    return doc


def _persist_settings_updates(doc, updates):
    updates = updates or {}
    if not updates:
        return doc

    if doc.is_new():
        # For new docs, set each field individually to skip invalid ones gracefully
        for fieldname, value in updates.items():
            if hasattr(doc, fieldname):
                try:
                    setattr(doc, fieldname, value)
                except Exception:
                    pass
        return _save_doc(doc)

    allowed_updates = {fieldname: value for fieldname, value in updates.items() if hasattr(doc, fieldname)}
    if not allowed_updates:
        return doc

    try:
        frappe.db.set_value("Profile Settings", doc.name, allowed_updates, update_modified=True)
    except Exception:
        # Fallback: set fields one by one to isolate problematic ones
        for fieldname, value in allowed_updates.items():
            try:
                frappe.db.set_value("Profile Settings", doc.name, fieldname, value, update_modified=True)
            except Exception:
                frappe.logger().warning(f"_persist_settings_updates: skipping {fieldname}")
    return frappe.get_doc("Profile Settings", doc.name)


def _default_settings(user):
    user_doc = frappe.db.get_value("User", user, ["full_name", "first_name"], as_dict=True) or {}
    display_name = user_doc.get("full_name") or user_doc.get("first_name") or user
    return {
        "user": user,
        "display_name": display_name,
        "motto": "",
        "work_field": "",
        "daily_water_goal": 8,
        "sleep_goal_hours": 7.5,
        "monthly_budget": 0,
        "language": "fa",
        "timezone": "Asia/Tehran",
        "currency": "IRR",
        "theme": "روشن",
        "week_starts_on": "شنبه",
        "onboarding_completed": 0,
        "onboarding_step": 0,
        "default_view": "داشبورد",
        "reminder_notifications": 1,
        "daily_reminder_time": None,
        "life_score_target": 70,
        "notion_pages_json": None,
        "sleep_preferences_json": None,
        "custom_exercises_json": None,
        "finance_quick_templates_json": None,
        "calendar_preferences_json": None,
        "custom_calendars_json": None,
        "debts_json": None,
        "subscriptions_json": None,
        "recurring_transactions_json": None,
        "assets_json": None,
        "installments_json": None,
        "diet_setting_json": None,
        "budget_settings_json": None,
        "subcategories_json": None,
        "task_time_json": None,
        "daily_highlights_json": None,
        "goal_habits_json": None,  # DEPRECATED: Use Goal Habit Link child table instead
    }


def _get_settings_meta_fieldnames():
    try:
        meta = frappe.get_meta("Profile Settings")
    except Exception:
        return set(SETTINGS_FIELDS)

    return {field.fieldname for field in meta.fields if getattr(field, "fieldname", None)}


def _get_supported_settings_fieldnames():
    return get_supported_settings_fields(_get_settings_meta_fieldnames())


def _get_settings_row(user=None):
    user = user or frappe.session.user
    return frappe.db.get_value("Profile Settings", {"user": user}, ["name", *_get_supported_settings_fieldnames()], as_dict=True)


def _get_settings_payload(user=None):
    user = user or frappe.session.user
    settings = _get_settings_row(user)
    if not settings:
        return _default_settings(user)
    payload = _default_settings(user)
    payload.update({fieldname: settings.get(fieldname) for fieldname in ["name", *SETTINGS_FIELDS] if fieldname in settings})
    return payload


def _get_or_create_settings_doc(user=None):
    user = user or frappe.session.user
    settings = _get_settings_row(user)
    if settings and settings.get("name"):
        return frappe.get_doc("Profile Settings", settings.name)

    doc = frappe.new_doc("Profile Settings")
    doc.user = user
    defaults = _default_settings(user)
    for fieldname in _get_supported_settings_fieldnames():
        if hasattr(doc, fieldname) and defaults.get(fieldname) is not None:
            setattr(doc, fieldname, defaults.get(fieldname))
    return doc


def _normalize_settings_update(data):
    return normalize_settings_update(data, available_fields=_get_supported_settings_fieldnames())


def _ensure_hambaft_user_role(user_name):
    if not frappe.db.exists("Role", "Hambaft User"):
        return

    user_doc = frappe.get_doc("User", user_name)
    existing_roles = {row.role for row in user_doc.get("roles") or []}
    if "Hambaft User" not in existing_roles:
        user_doc.append("roles", {"role": "Hambaft User"})
        user_doc.save(ignore_permissions=True)


def _extract_note_blocks(doc):
    """Parse note_blocks_json from a doc into noteBlocks list for frontend."""
    raw = getattr(doc, "note_blocks_json", None) if hasattr(doc, "note_blocks_json") else None
    return _loads_json(raw, [])


def _inject_note_blocks(data):
    """Convert frontend noteBlocks array into note_blocks_json string for DB."""
    if not isinstance(data, dict):
        return data
    blocks = data.pop("noteBlocks", None)
    if blocks is not None:
        data["note_blocks_json"] = json.dumps(blocks, ensure_ascii=False)
    return data


def _create_project_task(project_name, task_data):
    """Create a real Task record linked to a project. Used instead of child table rows."""
    status = task_data.get("status") or ("done" if task_data.get("completed") else "inbox")
    # Normalize Persian statuses to English
    status = _STATUS_FA_TO_EN.get(status, status)
    priority = task_data.get("priority") or "متوسط"
    priority = _normalize_task_priority(priority)
    task_doc = frappe.new_doc("Task")
    task_doc.title = task_data.get("title")
    task_doc.description = task_data.get("description") or ""
    task_doc.project = project_name
    task_doc.status = status
    task_doc.priority = priority
    task_doc.importance = task_data.get("importance") or "عادی"
    task_doc.due_date = task_data.get("dueDate") or task_data.get("due_date")
    task_doc.is_daily_highlight = 1 if task_data.get("isDailyHighlight") or task_data.get("is_daily_highlight") else 0
    task_doc.estimated_minutes = task_data.get("estimatedMinutes") or task_data.get("estimated_minutes")
    task_doc.actual_minutes = task_data.get("actualMinutes") or task_data.get("actual_minutes")
    task_doc.user = frappe.session.user
    # Inherit area/goal from project if not provided
    try:
        proj_doc = frappe.get_doc("Hambaft Project", project_name)
        if not task_data.get("area") and proj_doc.area:
            task_doc.area = proj_doc.area
        if not task_data.get("goal") and proj_doc.goal:
            task_doc.goal = proj_doc.goal
    except Exception:
        pass
    task_doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return task_doc


def _sync_project_tasks(project_name, tasks_list, user=None):
    """Synchronize project tasks: existing Task records are updated,
    new ones are created, and stale ones (no longer in the list) are unlinked.
    This replaces the old child-table sync."""
    user = user or frappe.session.user
    _done_statuses = {"done", "completed", "انجام‌شده", "انجام شده"}

    # Get current linked tasks from the Task doctype
    existing = frappe.get_all(
        "Task",
        filters={"project": project_name},
        fields=["name"],
    )
    existing_names = {row.name for row in existing}
    sent_names = set()

    # Cache project doc for area/goal inheritance
    try:
        proj_doc = frappe.get_doc("Hambaft Project", project_name)
    except Exception:
        proj_doc = None

    for task in tasks_list:
        tid = task.get("id") or task.get("name")
        # Skip optimistic/frontend-generated IDs
        is_temp = not tid or str(tid).startswith(("pt-", "tk-p-", "tk-", "new-"))
        status = task.get("status") or ("done" if task.get("completed") else "inbox")
        status = _STATUS_FA_TO_EN.get(status, status)
        priority = task.get("priority") or "متوسط"
        priority = _normalize_task_priority(priority)

        if is_temp or tid not in existing_names:
            # Create new Task
            task_doc = frappe.new_doc("Task")
            task_doc.title = task.get("title")
            task_doc.description = task.get("description") or ""
            task_doc.project = project_name
            task_doc.status = status
            task_doc.priority = priority
            task_doc.importance = task.get("importance") or "عادی"
            task_doc.due_date = task.get("dueDate") or task.get("due_date")
            task_doc.is_daily_highlight = 1 if task.get("isDailyHighlight") or task.get("is_daily_highlight") else 0
            task_doc.estimated_minutes = task.get("estimatedMinutes") or task.get("estimated_minutes")
            task_doc.actual_minutes = task.get("actualMinutes") or task.get("actual_minutes")
            task_doc.user = user
            if proj_doc:
                if not task.get("area") and proj_doc.area:
                    task_doc.area = proj_doc.area
                if not task.get("goal") and proj_doc.goal:
                    task_doc.goal = proj_doc.goal
            task_doc.insert(ignore_permissions=True)
            sent_names.add(task_doc.name)
        else:
            # Update existing Task
            task_doc = frappe.get_doc("Task", tid)
            if task.get("title") is not None:
                task_doc.title = task.get("title")
            if task.get("description") is not None:
                task_doc.description = task.get("description")
            task_doc.status = status
            task_doc.priority = priority
            if task.get("importance") is not None:
                task_doc.importance = task.get("importance")
            if task.get("dueDate") or task.get("due_date"):
                task_doc.due_date = task.get("dueDate") or task.get("due_date")
            task_doc.is_daily_highlight = 1 if task.get("isDailyHighlight") or task.get("is_daily_highlight") else 0
            if task.get("estimatedMinutes") or task.get("estimated_minutes"):
                task_doc.estimated_minutes = task.get("estimatedMinutes") or task.get("estimated_minutes")
            if task.get("actualMinutes") or task.get("actual_minutes"):
                task_doc.actual_minutes = task.get("actualMinutes") or task.get("actual_minutes")
            task_doc.save(ignore_permissions=True)
            sent_names.add(tid)

    # Remove project link from tasks that are no longer in the list
    for name in existing_names - sent_names:
        try:
            task_doc = frappe.get_doc("Task", name)
            task_doc.project = None
            task_doc.save(ignore_permissions=True)
        except Exception:
            pass

    frappe.db.commit()


def _project_to_frontend(doc):
    _done_statuses = {"done", "completed", "انجام‌شده", "انجام شده"}
    task_rows = []
    milestone_total = 0
    milestone_done = 0
    key_total = 0
    key_done = 0

    # Read tasks from the main Task doctype (single source of truth).
    # A task belongs to a project when task.project == project_name.
    linked_tasks = frappe.get_all(
        "Task",
        filters={"project": doc.name, "user": doc.user or frappe.session.user},
        fields=["name", "title", "status", "priority", "importance",
                "description", "due_date", "creation", "is_daily_highlight",
                "category", "area", "goal", "parent_task",
                "estimated_minutes", "actual_minutes", "effort_type",
                "note_blocks_json", "blocked_by_json", "blocking_json"],
        order_by="creation asc",
    )
    for row in linked_tasks:
        imp = row.get("importance") or "عادی"
        is_done = row.get("status") in _done_statuses
        if imp == "نقطه‌عطف":
            milestone_total += 1
            if is_done:
                milestone_done += 1
        elif imp == "کلیدی":
            key_total += 1
            if is_done:
                key_done += 1
        task_rows.append({
            "id": row.get("name"),
            "title": row.get("title"),
            "completed": is_done,
            "status": row.get("status"),
            "importance": imp,
            "createdAt": str(row.get("creation") or doc.creation or today())[:10],
            "description": row.get("description") or "",
            "dueDate": str(row.get("due_date"))[:10] if row.get("due_date") else None,
            "priority": row.get("priority"),
            "category": row.get("category"),
            "areaId": row.get("area"),
            "goalId": row.get("goal"),
            "parentTaskId": row.get("parent_task"),
            "isDailyHighlight": bool(row.get("is_daily_highlight")),
            "estimatedMinutes": row.get("estimated_minutes"),
            "actualMinutes": row.get("actual_minutes"),
            "effortType": row.get("effort_type"),
        })

    # Quality-aware progress (same logic as compute_progress on the doc)
    total_weight = 0
    done_weight = 0
    for row in linked_tasks:
        imp = row.get("importance") or "عادی"
        w = 3 if imp == "نقطه‌عطف" else 2 if imp == "کلیدی" else 1
        total_weight += w
        if row.get("status") in _done_statuses:
            done_weight += w
    quality_progress = int((done_weight / total_weight) * 100) if total_weight > 0 else 0

    # Goal health state (if project is linked to a goal)
    goal_health_state = None
    contribution_type = None
    if doc.goal:
        try:
            link = frappe.get_all(
                "Goal Project Link",
                filters={"project": doc.name, "parent": doc.goal, "parenttype": "Goal"},
                fields=["contribution_type"],
                limit=1,
            )
            if link:
                contribution_type = link[0].contribution_type
            goal_doc = frappe.get_doc("Goal", doc.goal)
            goal_health_state = getattr(goal_doc, "health_state", None)
        except Exception:
            pass

    return {
        "name": doc.name,
        "title": doc.title,
        "description": doc.description or "",
        "notes": doc.notes or "",
        "goal": doc.goal,
        "area": doc.area or None,
        "parent_project": doc.parent_project or None,
        "status": doc.status,
        "priority": doc.priority,
        "start_date": doc.start_date,
        "target_date": doc.target_date,
        "progress": doc.progress or 0,
        "quality_progress": quality_progress,
        "milestone_total": milestone_total,
        "milestone_done": milestone_done,
        "key_total": key_total,
        "key_done": key_done,
        "color": doc.color,
        "icon": doc.icon,
        "actual_minutes": doc.actual_minutes or 0,
        "blocked_by_json": doc.blocked_by_json or None,
        "effort_type": doc.effort_type or None,
        "estimated_hours": doc.estimated_hours or None,
        "contribution_type": contribution_type,
        "goal_health_state": goal_health_state,
        "tasks": task_rows,
        "creation": str(doc.creation) if getattr(doc, "creation", None) else None,
        "noteBlocks": _extract_note_blocks(doc),
    }


def _measurement_entry(measurement_type, value, measured_on, unit=None, notes=None):
    doc = frappe.new_doc("Hambaft Measurement")
    doc.user = frappe.session.user
    doc.measurement_type = measurement_type
    doc.value = flt(value or 0)
    doc.unit = unit
    doc.measured_on = measured_on
    doc.notes = notes
    doc.insert(ignore_permissions=True)
    return doc


def _advance_date(base_date, billing_cycle):
    current = getdate(base_date)
    cycle = (billing_cycle or "").strip()
    if cycle == "هفتگی":
        return current + timedelta(days=7)
    if cycle == "سالانه":
        return date(current.year + 1, current.month, min(current.day, 28 if current.month == 2 else current.day))
    if cycle == "سفارشی":
        return current + timedelta(days=30)

    month = current.month + 1
    year = current.year
    if month > 12:
        month = 1
        year += 1
    day = min(current.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


# ─── Health / Ping ──────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def ping():
    """Simple health check endpoint."""
    return {"status": "ok", "app": "hambaft", "version": "0.0.1"}


@frappe.whitelist(allow_guest=True)
def get_app_info():
    """Return app metadata."""
    return {
        "app_name": "hambaft",
        "app_title": "Hambaft",
        "version": "0.0.1",
        "description": "Personal Life Management OS",
    }


@frappe.whitelist(allow_guest=True)
def check_session():
    """Check if the current request has an active Frappe session.
    
    Returns the logged-in user's email/id string, or 'Guest' if not authenticated.
    This is the safe replacement for frappe.auth.get_logged_user which requires
    internal whitelist configuration.
    """
    user = frappe.session.user
    return {
        "user": user,
        "csrf_token": _get_session_csrf_token() if user != "Guest" else "",
    }


@frappe.whitelist()
def get_profile():
    """Return the current authenticated user's profile summary.

    This endpoint lives in ``api.py`` because that module is already used by
    multiple active hooks and public methods in production, so it is the most
    reliable namespace for the SPA to call.
    """
    if frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    user = frappe.session.user
    user_doc = frappe.get_doc("User", user)
    signup_date = str(user_doc.creation) if getattr(user_doc, "creation", None) else None

    profile_name = frappe.db.get_value("Hambaft Profile", {"user": user}, "name")
    if profile_name:
        profile = frappe.get_doc("Hambaft Profile", profile_name)
        if profile.signup_date:
            signup_date = str(profile.signup_date)

    return {
        "name": user_doc.name,
        "full_name": user_doc.full_name,
        "email": user_doc.email,
        "signup_date": signup_date,
        "csrf_token": _get_session_csrf_token(),
    }


@frappe.whitelist()
def update_profile(data):
    """Update the authenticated user's profile and the user-facing settings fields."""
    if frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    if isinstance(data, str):
        data = json.loads(data)

    data = data or {}
    user = frappe.session.user
    user_doc = frappe.get_doc("User", user)

    full_name = (data.get("name") or data.get("full_name") or "").strip()
    if full_name:
        user_doc.full_name = full_name
        parts = full_name.split(" ", 1)
        user_doc.first_name = parts[0]
        if len(parts) > 1:
            user_doc.last_name = parts[1]
        user_doc.save(ignore_permissions=True)

    settings_doc = _get_or_create_settings_doc(user)

    settings_updates = {}
    for fieldname in ("motto", "work_field", "daily_water_goal", "sleep_goal_hours", "monthly_budget", "display_name"):
        if fieldname in data:
            settings_updates[fieldname] = data.get(fieldname)

    if "name" in data and "display_name" not in settings_updates:
        settings_updates["display_name"] = data.get("name")

    if settings_updates:
        settings_doc = _persist_settings_updates(settings_doc, settings_updates)

    frappe.db.commit()

    refreshed_user = frappe.get_doc("User", user)
    refreshed_settings = _get_settings_payload(user)

    return _api_response({
        "profile": {
            "name": refreshed_user.name,
            "full_name": refreshed_user.full_name,
            "email": refreshed_user.email,
            "signup_date": str(refreshed_user.creation) if getattr(refreshed_user, "creation", None) else None,
        },
        "settings": refreshed_settings,
    })



# ─── Password Change ────────────────────────────────────────────

@frappe.whitelist()
def change_password(old_password, new_password):
    """Change the current user's password using Frappe's built-in method."""
    from frappe.utils.password import check_password, update_password
    from frappe import _
    try:
        # Verify old password
        user = frappe.session.user
        check_password(user, old_password)
        # Update to new password
        update_password(user, new_password)
        frappe.db.commit()
        return {"message": _("Password updated successfully")}
    except frappe.AuthenticationError:
        frappe.throw(_("Current password is incorrect"), frappe.AuthenticationError)


# ─── Auth (Login / Signup) ──────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def login(email, password):
    try:
        from frappe.auth import LoginManager
        login_manager = LoginManager()
        login_manager.authenticate(email, password)
        login_manager.post_login()
    except frappe.AuthenticationError:
        frappe.throw("Invalid email or password", frappe.AuthenticationError)

    user = frappe.get_doc("User", frappe.session.user)
    _ensure_hambaft_user_role(user.name)
    settings_doc = _get_or_create_settings_doc(user.name)
    if settings_doc.is_new():
        _save_doc(settings_doc)
        frappe.db.commit()
    settings = _get_settings_payload(user.name)

    return {
        "status": "success",
        "csrf_token": _get_session_csrf_token(),
        "data": {
            "user": {
                "name": user.name,
                "email": user.email,
                "display_name": user.full_name or user.first_name or user.name,
            },
            "onboarding_completed": bool(settings.get("onboarding_completed")) if settings else False,
            "csrf_token": _get_session_csrf_token(),
        }
    }


@frappe.whitelist(allow_guest=True)
def signup(email, password, display_name=None):
    if frappe.db.exists("User", email):
        frappe.throw("User already exists")

    user = frappe.new_doc("User")
    user.email = email
    user.first_name = display_name or email.split("@")[0]
    user.send_welcome_email = 0
    user.insert(ignore_permissions=True)
    user.new_password = password
    user.save(ignore_permissions=True)
    _ensure_hambaft_user_role(user.name)

    settings_doc = _get_or_create_settings_doc(user.name)
    if display_name:
        settings_doc.display_name = display_name
    _save_doc(settings_doc)
    frappe.db.commit()

    from frappe.auth import LoginManager
    login_manager = LoginManager()
    login_manager.authenticate(email, password)
    login_manager.post_login()

    return {
        "status": "success",
        "csrf_token": _get_session_csrf_token(),
        "data": {
            "user": {
                "name": user.name,
                "email": user.email,
                "display_name": user.full_name or user.first_name,
            },
            "onboarding_completed": False,
            "csrf_token": _get_session_csrf_token(),
        }
    }


# ─── Goals CRUD ─────────────────────────────────────────────────

@frappe.whitelist()
def get_goals(status=None, category=None, limit=50, offset=0):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if status:
        filters["status"] = status
    if category:
        filters["category"] = category
    goals = frappe.get_all("Goal", filters=filters, fields="*",
                           limit_page_length=cint(limit), start=cint(offset))
    return _api_response({"goals": goals})


@frappe.whitelist()
def get_goal(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"goal": frappe.get_doc("Goal", name).as_dict()})


@frappe.whitelist()
def create_goal(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    data = _inject_note_blocks(data)
    # Extract child table data before update
    habits_data = data.pop("linked_habits", None) or data.pop("linkedHabits", None) or []
    finance_data = data.pop("linked_finance_accounts", None) or data.pop("linkedFinanceAccounts", None) or []
    projects_data = data.pop("linked_projects", None) or data.pop("linkedProjects", None) or []
    doc = frappe.new_doc("Goal")
    doc.update(data)
    doc.user = frappe.session.user
    # Add linked habits
    for h in habits_data:
        if isinstance(h, dict) and h.get("habit"):
            doc.append("linked_habits", {
                "habit": h.get("habit"),
                "contribution_type": h.get("contribution_type") or "تعداد_انجام",
                "weight": flt(h.get("weight") or 100),
                "period": h.get("period") or "ماهانه",
                "target_value": flt(h.get("target_value")) if h.get("target_value") else None,
                "cap_value": flt(h.get("cap_value")) if h.get("cap_value") else None,
                "is_negative": cint(h.get("is_negative") or 0),
                "notes": h.get("notes") or "",
            })
    # Add linked finance accounts
    for f in finance_data:
        if isinstance(f, dict) and f.get("finance_account"):
            doc.append("linked_finance_accounts", {
                "finance_account": f.get("finance_account"),
                "finance_type": f.get("finance_type") or "موجودی_حساب",
                "initial_amount": flt(f.get("initial_amount")) if f.get("initial_amount") else None,
                "target_amount": flt(f.get("target_amount")) if f.get("target_amount") else None,
                "weight": flt(f.get("weight") or 100),
                "notes": f.get("notes") or "",
            })
    # Add linked projects
    for p in projects_data:
        proj_name = p.get("project") if isinstance(p, dict) else p
        if not proj_name:
            continue
        doc.append("linked_projects", {
            "project": proj_name,
            "contribution_type": (p.get("contribution_type") if isinstance(p, dict) else None) or "اجباری",
            "weight": flt(p.get("weight") if isinstance(p, dict) else 100 or 100),
            "is_mandatory": cint(p.get("is_mandatory") if isinstance(p, dict) else 1 or 1),
            "sort_order": cint(p.get("sort_order") if isinstance(p, dict) else 0 or 0),
            "notes": (p.get("notes") if isinstance(p, dict) else None) or "",
        })
    doc.insert()
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def update_goal(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    data = _inject_note_blocks(data)
    # Extract child table data
    habits_data = data.pop("linked_habits", None) or data.pop("linkedHabits", None)
    finance_data = data.pop("linked_finance_accounts", None) or data.pop("linkedFinanceAccounts", None)
    projects_data = data.pop("linked_projects", None) or data.pop("linkedProjects", None)
    doc = frappe.get_doc("Goal", name)
    doc.update(data)
    # Replace linked habits if provided
    if habits_data is not None:
        doc.set("linked_habits", [])
        for h in habits_data:
            if isinstance(h, dict) and h.get("habit"):
                doc.append("linked_habits", {
                    "habit": h.get("habit"),
                    "contribution_type": h.get("contribution_type") or "تعداد_انجام",
                    "weight": flt(h.get("weight") or 100),
                    "period": h.get("period") or "ماهانه",
                    "target_value": flt(h.get("target_value")) if h.get("target_value") else None,
                    "cap_value": flt(h.get("cap_value")) if h.get("cap_value") else None,
                    "is_negative": cint(h.get("is_negative") or 0),
                    "notes": h.get("notes") or "",
                })
    # Replace linked finance if provided
    if finance_data is not None:
        doc.set("linked_finance_accounts", [])
        for f in finance_data:
            if isinstance(f, dict) and f.get("finance_account"):
                doc.append("linked_finance_accounts", {
                    "finance_account": f.get("finance_account"),
                    "finance_type": f.get("finance_type") or "موجودی_حساب",
                    "initial_amount": flt(f.get("initial_amount")) if f.get("initial_amount") else None,
                    "target_amount": flt(f.get("target_amount")) if f.get("target_amount") else None,
                    "weight": flt(f.get("weight") or 100),
                    "notes": f.get("notes") or "",
                })
    # Replace linked projects if provided
    if projects_data is not None:
        doc.set("linked_projects", [])
        for p in projects_data:
            proj_name = p.get("project") if isinstance(p, dict) else p
            if not proj_name:
                continue
            doc.append("linked_projects", {
                "project": proj_name,
                "contribution_type": (p.get("contribution_type") if isinstance(p, dict) else None) or "اجباری",
                "weight": flt(p.get("weight") if isinstance(p, dict) else 100 or 100),
                "is_mandatory": cint(p.get("is_mandatory") if isinstance(p, dict) else 1 or 1),
                "sort_order": cint(p.get("sort_order") if isinstance(p, dict) else 0 or 0),
                "notes": (p.get("notes") if isinstance(p, dict) else None) or "",
            })
    doc.save()
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def delete_goal(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Goal", name)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_areas(limit=50, offset=0):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    areas = frappe.get_all("Hambaft Area", filters=_owner_filter(), fields="*",
                           limit_page_length=cint(limit), start=cint(offset),
                           order_by="title asc")
    return _api_response({"areas": areas})


@frappe.whitelist()
def update_goal_progress(name, current_value):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    doc = frappe.get_doc("Goal", name)
    doc.current_value = flt(current_value)
    doc.save()
    frappe.db.commit()
    return _api_response({"goal": doc.as_dict()})


# ─── Tasks CRUD ─────────────────────────────────────────────────

@frappe.whitelist()
def get_tasks(status=None, priority=None, due_date_gte=None, goal=None, limit=50, offset=0):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if status:
        filters["status"] = status
    if priority:
        filters["priority"] = priority
    if due_date_gte:
        filters["due_date"] = [">=", due_date_gte]
    if goal:
        filters["goal"] = goal
    tasks = frappe.get_all("Task", filters=filters, fields="*",
                           limit_page_length=cint(limit), start=cint(offset),
                           order_by="creation desc")
    return _api_response({"tasks": tasks})


@frappe.whitelist()
def get_task(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"task": frappe.get_doc("Task", name).as_dict()})


@frappe.whitelist()
def create_task(data=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if data is None:
        data = {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            data = {}
    data = _normalize_task_data(data)
    data = _inject_note_blocks(data)
    doc = frappe.new_doc("Task")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    result = doc.as_dict()
    result["noteBlocks"] = _extract_note_blocks(doc)
    return _api_response({"task": result})


@frappe.whitelist()
def update_task(name, data=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if data is None:
        data = {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            data = {}
    data = _normalize_task_data(data)
    data = _inject_note_blocks(data)
    doc = frappe.get_doc("Task", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    result = doc.as_dict()
    result["noteBlocks"] = _extract_note_blocks(doc)
    return _api_response({"task": result})


@frappe.whitelist()
def complete_task(name, actual_minutes=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    doc = frappe.get_doc("Task", name)
    doc.status = "done"
    doc.completed_on = now_datetime()
    if actual_minutes:
        doc.actual_minutes = cint(actual_minutes)
    doc.save()
    # Also complete all subtasks recursively
    children = frappe.get_all("Task", filters={"parent_task": name, "status": ["!=", "done"]}, pluck="name")
    for child in children:
        complete_task(child)
    frappe.db.commit()
    return _api_response({"task": doc.as_dict()})


@frappe.whitelist()
def delete_task(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    # Recursively delete all subtasks first
    children = frappe.get_all("Task", filters={"parent_task": name}, pluck="name")
    for child in children:
        # Recursively delete grandchildren
        delete_task(child)
    # Clear parent_task references that point to this task
    frappe.db.sql("UPDATE `tabTask` SET parent_task = NULL WHERE parent_task = %s", name)
    frappe.delete_doc("Task", name)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def bulk_update_tasks(names, updates):
    """Bulk update multiple tasks at once.

    Args:
        names: JSON string of task name list, e.g. '["TASK-001","TASK-002"]'
        updates: JSON string of field updates, e.g. '{"status":"done","priority":"high"}'
    """
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(names, str):
        try:
            names = json.loads(names)
        except (json.JSONDecodeError, ValueError):
            names = []
    if isinstance(updates, str):
        try:
            updates = json.loads(updates)
        except (json.JSONDecodeError, ValueError):
            updates = {}
    if not names or not updates:
        frappe.throw("names and updates are required")

    _IMPORTANCE_MAP = {"normal": "عادی", "key": "کلیدی", "milestone": "نقطه‌عطف"}

    allowed_fields = {"status", "priority", "importance"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    if not filtered_updates:
        frappe.throw("No valid fields to update")

    # Normalize status: Persian → English if needed
    if "status" in filtered_updates:
        filtered_updates["status"] = _normalize_task_status(filtered_updates["status"])
    if "importance" in filtered_updates and filtered_updates["importance"] in _IMPORTANCE_MAP:
        filtered_updates["importance"] = _IMPORTANCE_MAP[filtered_updates["importance"]]

    updated = 0
    errors = 0
    for name in names:
        try:
            doc = frappe.get_doc("Task", name)
            if doc.user and doc.user != frappe.session.user:
                errors += 1
                continue
            for field, value in filtered_updates.items():
                doc.set(field, value)
            doc.save(ignore_permissions=True)
            updated += 1
        except Exception:
            errors += 1

    frappe.db.commit()
    return _api_response({"updated": updated, "errors": errors})


# ─── Habits CRUD ────────────────────────────────────────────────

@frappe.whitelist()
def get_habits(is_active=None, frequency=None, category=None, limit=50, offset=0):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if is_active is not None:
        filters["is_active"] = cint(is_active)
    if frequency:
        filters["frequency"] = frequency
    if category:
        filters["category"] = category
    habits = frappe.get_all("Habit", filters=filters, fields="*",
                            limit_page_length=cint(limit), start=cint(offset))
    return _api_response({"habits": habits})


@frappe.whitelist()
def get_habit(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"habit": frappe.get_doc("Habit", name).as_dict()})


@frappe.whitelist()
def create_habit(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Habit")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    return _api_response({"habit": doc.as_dict()})


@frappe.whitelist()
def update_habit(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Habit", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"habit": doc.as_dict()})


@frappe.whitelist()
def delete_habit(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Habit", name)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def log_habit(habit, date=None, status="انجام‌شده", value=1, note=None, mood=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if not date:
        date = today()
    existing = frappe.db.exists(
        "Habit Log",
        {"habit": habit, "date": date, "user": frappe.session.user}
    )
    if existing:
        doc = frappe.get_doc("Habit Log", existing)
        doc.status = status
        doc.value = flt(value)
        if note:
            doc.note = note
        if mood:
            doc.mood = mood
    else:
        doc = frappe.new_doc("Habit Log")
        doc.habit = habit
        doc.date = date
        doc.status = status
        doc.value = flt(value)
        doc.note = note
        doc.mood = mood
    doc.user = frappe.session.user
    doc.save()
    frappe.db.commit()
    return _api_response({"log": doc.as_dict()})


@frappe.whitelist()
def get_habit_logs(habit=None, from_date=None, to_date=None, limit=100):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = {"user": frappe.session.user}
    if habit:
        filters["habit"] = habit
    if from_date:
        filters["date"] = [">=", from_date]
    if to_date:
        if "date" in filters:
            filters["date"] = ["between", [from_date, to_date]]
        else:
            filters["date"] = ["<=", to_date]
    logs = frappe.get_all("Habit Log", filters=filters, fields="*",
                          limit_page_length=cint(limit), order_by="date desc")
    return _api_response({"logs": logs})


@frappe.whitelist()
def get_habit_streak(habit):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    habit_doc = frappe.get_doc("Habit", habit)
    return _api_response({"current": habit_doc.streak_current or 0, "best": habit_doc.streak_best or 0})


# ─── Notes CRUD ─────────────────────────────────────────────────

@frappe.whitelist()
def get_notes(category=None, is_pinned=None, tag=None, limit=50, offset=0):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if category:
        filters["category"] = category
    if is_pinned is not None:
        filters["is_pinned"] = cint(is_pinned)
    notes = frappe.get_all("Note", filters=filters, fields="*",
                           limit_page_length=cint(limit), start=cint(offset),
                           order_by="date desc, creation desc")
    return _api_response({"notes": notes})


@frappe.whitelist()
def get_note(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"note": frappe.get_doc("Note", name).as_dict()})


@frappe.whitelist()
def create_note(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Note")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    return _api_response({"note": doc.as_dict()})


@frappe.whitelist()
def update_note(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Note", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"note": doc.as_dict()})


@frappe.whitelist()
def delete_note(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Note", name)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Finance CRUD ───────────────────────────────────────────────

@frappe.whitelist()
def get_finance_entries(type=None, from_date=None, to_date=None, category=None, limit=50, offset=0):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    type_map = {"income": "درآمد", "expense": "هزینه"}
    if type:
        filters["type"] = type_map.get(type, type)
    if from_date:
        filters["date"] = [">=", from_date]
    if to_date:
        if "date" in filters:
            filters["date"] = ["between", [from_date, to_date]]
        else:
            filters["date"] = ["<=", to_date]
    if category:
        filters["category"] = category
    entries = frappe.get_all("Finance Entry", filters=filters, fields="*",
                             limit_page_length=cint(limit), start=cint(offset),
                             order_by="date desc, creation desc")
    total_income = flt(frappe.db.sql(
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='درآمد'",
        frappe.session.user)[0][0] or 0)
    total_expense = flt(frappe.db.sql(
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='هزینه'",
        frappe.session.user)[0][0] or 0)
    return _api_response({"entries": entries, "total_income": total_income, "total_expense": total_expense})


@frappe.whitelist()
def get_finance_entry(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"entry": frappe.get_doc("Finance Entry", name).as_dict()})


@frappe.whitelist()
def create_finance_entry(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Finance Entry")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    return _api_response({"entry": doc.as_dict()})


@frappe.whitelist()
def update_finance_entry(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Finance Entry", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"entry": doc.as_dict()})


@frappe.whitelist()
def delete_finance_entry(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Finance Entry", name)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_finance_summary(month=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if not month:
        month = today()[:7]
    from_date = f"{month}-01"
    year, mon = int(month[:4]), int(month[5:7])
    if mon == 12:
        to_date = f"{year + 1}-01-01"
    else:
        to_date = f"{year}-{mon + 1:02d}-01"
    income = flt(frappe.db.sql(
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='درآمد' AND date>=%s AND date<%s",
        (frappe.session.user, from_date, to_date))[0][0] or 0)
    expense = flt(frappe.db.sql(
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='هزینه' AND date>=%s AND date<%s",
        (frappe.session.user, from_date, to_date))[0][0] or 0)
    by_category = frappe.db.sql(
        "SELECT category, SUM(amount) as total FROM `tabFinance Entry` WHERE user=%s AND type='هزینه' AND date>=%s AND date<%s GROUP BY category ORDER BY total DESC",
        (frappe.session.user, from_date, to_date), as_dict=True)
    return _api_response({
        "income": income, "expense": expense, "balance": income - expense,
        "by_category": {c.category: c.total for c in by_category if c.category}
    })


# ─── Calendar CRUD ──────────────────────────────────────────────

@frappe.whitelist()
def get_events(from_date=None, to_date=None, event_type=None, limit=100):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if from_date:
        filters["starts_at"] = [">=", from_date]
    if to_date:
        if "starts_at" in filters:
            filters["starts_at"] = ["between", [from_date, to_date]]
        else:
            filters["starts_at"] = ["<=", to_date]
    if event_type:
        filters["event_type"] = event_type
    events = frappe.get_all("Calendar Event", filters=filters, fields="*",
                            limit_page_length=cint(limit), order_by="starts_at asc")
    return _api_response({"events": events})


@frappe.whitelist()
def get_event(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"event": frappe.get_doc("Calendar Event", name).as_dict()})


@frappe.whitelist()
def create_event(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Calendar Event")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    return _api_response({"event": doc.as_dict()})


@frappe.whitelist()
def update_event(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Calendar Event", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"event": doc.as_dict()})


@frappe.whitelist()
def delete_event(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Calendar Event", name)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Reviews CRUD ───────────────────────────────────────────────

@frappe.whitelist()
def get_reviews(period=None, from_date=None, to_date=None, limit=50, offset=0):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if period:
        filters["period"] = period
    if from_date:
        filters["date"] = [">=", from_date]
    if to_date:
        if "date" in filters:
            filters["date"] = ["between", [from_date, to_date]]
        else:
            filters["date"] = ["<=", to_date]
    reviews = frappe.get_all("Review", filters=filters, fields="*",
                             limit_page_length=cint(limit), start=cint(offset),
                             order_by="date desc")
    return _api_response({"reviews": reviews})


@frappe.whitelist()
def get_review(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"review": frappe.get_doc("Review", name).as_dict()})


@frappe.whitelist()
def create_review(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Review")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    return _api_response({"review": doc.as_dict()})


@frappe.whitelist()
def update_review(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Review", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"review": doc.as_dict()})


# ─── Water Logs ─────────────────────────────────────────────────

@frappe.whitelist()
def get_water_logs(from_date=None, to_date=None, limit=100):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    date_field = _water_date_field()
    if from_date:
        filters[date_field] = [">=", from_date]
    if to_date:
        if date_field in filters:
            filters[date_field] = ["between", [from_date, to_date]]
        else:
            filters[date_field] = ["<=", to_date]
    logs = frappe.get_all("Water Log", filters=filters, fields="*",
                          limit_page_length=cint(limit), order_by=f"{date_field} desc")
    return _api_response({"logs": logs})


@frappe.whitelist()
def log_water(date=None, amount_ml=0, note=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if not date:
        date = today()
    date_field = _water_date_field()
    note_field = _water_note_field()
    water_fields = _water_fieldnames()
    existing = frappe.db.exists("Water Log", {date_field: date, "user": frappe.session.user})
    if existing:
        doc = frappe.get_doc("Water Log", existing)
    else:
        doc = frappe.new_doc("Water Log")
        setattr(doc, date_field, date)

    if "completed_glasses" in water_fields:
        glass_size = cint(getattr(doc, "glass_size_ml", None) or 250)
        completed_glasses = max(0, round(flt(amount_ml) / max(glass_size, 1)))
        doc.completed_glasses = completed_glasses
        doc.total_ml = flt(amount_ml)
        if hasattr(doc, "goal_glasses") and not getattr(doc, "goal_glasses", None):
            doc.goal_glasses = 8
        if hasattr(doc, "glass_size_ml") and not getattr(doc, "glass_size_ml", None):
            doc.glass_size_ml = glass_size
    else:
        doc.amount_ml = cint(amount_ml)

    if note:
        setattr(doc, note_field, note)
    doc.user = frappe.session.user
    doc.save()
    frappe.db.commit()
    return _api_response({"log": doc.as_dict()})


@frappe.whitelist()
def get_water_summary(date=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if not date:
        date = today()
    date_field = _water_date_field()
    water_fields = _water_fieldnames()

    if "completed_glasses" in water_fields:
        log = frappe.db.get_value(
            "Water Log",
            {date_field: date, "user": frappe.session.user},
            ["completed_glasses", "goal_glasses", "glass_size_ml", "total_ml"],
            as_dict=True,
        )
        if not log:
            return _api_response({"consumed_ml": 0, "target_ml": 2000, "percent": 0})
        glass_size = cint(log.glass_size_ml or 250)
        consumed = flt(log.total_ml or ((log.completed_glasses or 0) * glass_size))
        target = flt((log.goal_glasses or 8) * glass_size)
    else:
        log = frappe.db.get_value(
            "Water Log",
            {date_field: date, "user": frappe.session.user},
            ["amount_ml", "target_ml"],
            as_dict=True,
        )
        if not log:
            return _api_response({"consumed_ml": 0, "target_ml": 2000, "percent": 0})
        consumed = log.amount_ml or 0
        target = log.target_ml or 2000

    if not log:
        return _api_response({"consumed_ml": 0, "target_ml": 2000, "percent": 0})
    percent = min(100, (consumed / max(target, 1)) * 100)
    return _api_response({"consumed_ml": consumed, "target_ml": target, "percent": percent})


# ─── Supplements ────────────────────────────────────────────────

@frappe.whitelist()
def get_supplements(is_active=None, limit=50):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if is_active is not None:
        filters["is_active"] = cint(is_active)
    supplements = frappe.get_all("Supplement Reminder", filters=filters, fields="*",
                                 limit_page_length=cint(limit))
    return _api_response({"supplements": supplements})


@frappe.whitelist()
def create_supplement(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Supplement Reminder")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    return _api_response({"supplement": doc.as_dict()})


@frappe.whitelist()
def update_supplement(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Supplement Reminder", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"supplement": doc.as_dict()})


@frappe.whitelist()
def delete_supplement(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Supplement Reminder", name)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Mood/Energy ────────────────────────────────────────────────

@frappe.whitelist()
def get_mood_logs(from_date=None, to_date=None, limit=100):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if from_date:
        filters["date"] = [">=", from_date]
    if to_date:
        if "date" in filters:
            filters["date"] = ["between", [from_date, to_date]]
        else:
            filters["date"] = ["<=", to_date]
    logs = frappe.get_all("Mood Energy Log", filters=filters, fields="*",
                          limit_page_length=cint(limit), order_by="date desc")
    return _api_response({"logs": logs})


@frappe.whitelist()
def log_mood_energy(date=None, mood=None, energy=None, stress=None, sleep_hours=None, note=None, gratitude=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if not date:
        date = today()
    existing = frappe.db.exists("Mood Energy Log", {"date": date, "user": frappe.session.user})
    if existing:
        doc = frappe.get_doc("Mood Energy Log", existing)
        if mood is not None:
            doc.mood = cint(mood)
        if energy is not None:
            doc.energy = cint(energy)
        if stress is not None:
            doc.stress = cint(stress)
        if sleep_hours is not None:
            doc.sleep_hours = flt(sleep_hours)
        if note:
            doc.note = note
        if gratitude:
            doc.gratitude = gratitude
    else:
        doc = frappe.new_doc("Mood Energy Log")
        doc.date = date
        if mood is not None:
            doc.mood = cint(mood)
        if energy is not None:
            doc.energy = cint(energy)
        if stress is not None:
            doc.stress = cint(stress)
        if sleep_hours is not None:
            doc.sleep_hours = flt(sleep_hours)
        doc.note = note
        doc.gratitude = gratitude
    doc.user = frappe.session.user
    doc.save()
    frappe.db.commit()
    return _api_response({"log": doc.as_dict()})


@frappe.whitelist()
def get_mood_trend(days=30):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    from_date = (datetime.now() - timedelta(days=cint(days))).strftime("%Y-%m-%d")
    logs = frappe.get_all("Mood Energy Log",
                          filters={"user": frappe.session.user, "date": [">=", from_date]},
                          fields="*", order_by="date asc")
    if not logs:
        return _api_response({"avg_mood": 0, "avg_energy": 0, "avg_sleep": 0, "trend": []})
    avg_mood = flt(sum(l.mood or 0 for l in logs)) / len(logs)
    avg_energy = flt(sum(l.energy or 0 for l in logs)) / len(logs)
    avg_sleep = flt(sum(l.sleep_hours or 0 for l in logs)) / len(logs)
    return _api_response({"avg_mood": round(avg_mood, 1), "avg_energy": round(avg_energy, 1),
                          "avg_sleep": round(avg_sleep, 1), "trend": logs})


@frappe.whitelist()
def delete_mood_log(name):
    """Delete a mood energy log entry."""
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    doc = frappe.get_doc("Mood Energy Log", name)
    if doc.user != frappe.session.user:
        frappe.throw("Not authorized", frappe.PermissionError)
    frappe.delete_doc("Mood Energy Log", name)
    return _api_response({"deleted": name})


# ─── Motivation ─────────────────────────────────────────────────

@frappe.whitelist()
def get_motivations(category=None, is_favorite=None, limit=20):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    filters = _owner_filter()
    if category:
        filters["category"] = category
    if is_favorite is not None:
        filters["is_favorite"] = cint(is_favorite)
    motivations = frappe.get_all("Motivation", filters=filters, fields="*",
                                 limit_page_length=cint(limit))
    return _api_response({"motivations": motivations})


@frappe.whitelist()
def get_daily_inspiration():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    motivations = frappe.get_all("Motivation",
                                 filters={"user": frappe.session.user, "show_on_dashboard": 1},
                                 fields="*")
    if motivations:
        return _api_response({"motivation": random.choice(motivations)})
    all_m = frappe.get_all("Motivation", filters={"user": frappe.session.user}, fields="*", limit=1)
    return _api_response({"motivation": all_m[0] if all_m else None})


@frappe.whitelist()
def create_motivation(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Motivation")
    doc.update(data)
    doc.user = frappe.session.user
    doc.insert()
    frappe.db.commit()
    return _api_response({"motivation": doc.as_dict()})


@frappe.whitelist()
def toggle_favorite(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    _require_owner("Motivation", name)
    doc = frappe.get_doc("Motivation", name)
    doc.is_favorite = not doc.is_favorite
    doc.save()
    frappe.db.commit()
    return _api_response({"is_favorite": doc.is_favorite})


# ─── Profile/Settings ───────────────────────────────────────────

@frappe.whitelist()
def get_settings():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    return _api_response({"settings": _get_settings_payload()})


@frappe.whitelist()
def update_settings(data=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if data is None:
        data = {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            data = {}
    data = data or {}
    data = _normalize_settings_update(data)
    if not data:
        return _api_response({"settings": _get_settings_payload()})
    doc = _get_or_create_settings_doc()
    doc = _persist_settings_updates(doc, data)
    frappe.db.commit()
    return _api_response({"settings": _get_settings_payload()})


@frappe.whitelist()
def complete_onboarding_step(step):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    doc = _get_or_create_settings_doc()
    doc = _persist_settings_updates(doc, {"onboarding_step": cint(step)})
    frappe.db.commit()
    return _api_response({"settings": doc.as_dict()})


@frappe.whitelist()
def finish_onboarding():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    doc = _get_or_create_settings_doc()
    doc = _persist_settings_updates(doc, {"onboarding_completed": 1, "onboarding_step": 5})
    frappe.db.commit()
    return _api_response({"settings": doc.as_dict()})


# ─── Onboarding ─────────────────────────────────────────────────

@frappe.whitelist()
def get_onboarding_status():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    settings = _get_settings_payload()
    if not settings:
        return _api_response({"completed": False, "current_step": 0, "total_steps": 5})
    return _api_response({
        "completed": bool(settings.get("onboarding_completed")),
        "current_step": settings.get("onboarding_step") or 0,
        "total_steps": 5
    })


@frappe.whitelist()
def submit_onboarding_step(step, data=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            data = {}
    data = _normalize_settings_update(data or {})
    step = cint(step)
    doc = _get_or_create_settings_doc()
    payload = dict(data or {})
    payload["onboarding_step"] = step
    _persist_settings_updates(doc, payload)
    frappe.db.commit()
    return _api_response({"ok": True, "next_step": step + 1})


# ─── Dashboard / Life Score ─────────────────────────────────────

@frappe.whitelist()
def get_life_score(date=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if not date:
        date = today()
    active_habits = frappe.get_all("Habit", filters={"user": frappe.session.user, "is_active": 1})
    done_today = [
        row for row in frappe.get_all(
            "Habit Log",
            filters={"user": frappe.session.user, "date": date},
            fields=["habit", "status"],
        )
        if row.get("status") in DONE_HABIT_STATUSES
    ]
    habit_score = (len(done_today) / max(len(active_habits), 1)) * 100
    tasks_due = _fetch_tasks_for_day(date)
    tasks_done = _fetch_done_tasks_for_day(date)
    total_tasks = len(tasks_due) + len(tasks_done)
    task_score = (len(tasks_done) / max(total_tasks, 1)) * 100
    active_goals = _fetch_active_goals()
    goal_score = flt(sum(g.progress_percent or 0 for g in active_goals)) / max(len(active_goals), 1) if active_goals else 0
    mood_log = frappe.db.get_value("Mood Energy Log",
                                   {"user": frappe.session.user, "date": date},
                                   ["mood", "energy"], as_dict=True)
    if mood_log and mood_log.mood and mood_log.energy:
        mood_score = ((flt(mood_log.mood) + flt(mood_log.energy)) / 2) * 10
    else:
        mood_score = 50
    finance_score = 100
    water = _unwrap_response(get_water_summary(date))
    water_score = water.get("percent", 0) if isinstance(water, dict) else 0
    life_score = (habit_score * 0.25 + task_score * 0.20 + goal_score * 0.20 +
                  mood_score * 0.15 + finance_score * 0.10 + water_score * 0.10)
    return _api_response({
        "score": round(min(100, max(0, life_score))),
        "breakdown": {
            "habit": round(habit_score), "task": round(task_score),
            "goal": round(goal_score), "mood": round(mood_score),
            "finance": round(finance_score), "water": round(water_score)
        }
    })


@frappe.whitelist()
def get_today_highlights(date=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if not date:
        date = today()
    tasks_due = _fetch_tasks_for_day(date, limit=10)
    pending_habits = _fetch_pending_habits(date)
    events_today = _fetch_events_for_day(date)
    water_status = _unwrap_response(get_water_summary(date))
    mood_today = frappe.db.get_value("Mood Energy Log",
                                     {"user": frappe.session.user, "date": date},
                                     ["mood", "energy"], as_dict=True)
    inspiration = _unwrap_response(get_daily_inspiration())
    return _api_response({
        "tasks_due": tasks_due, "habits_pending": pending_habits,
        "events_today": events_today, "water_status": water_status,
        "mood_today": mood_today,
        "inspiration": inspiration.get("motivation") if isinstance(inspiration, dict) else inspiration,
    })


@frappe.whitelist()
def get_dashboard():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    date = today()
    life_score = _unwrap_response(get_life_score(date))
    highlights = _unwrap_response(get_today_highlights(date))
    finance_summary = _unwrap_response(get_finance_summary(date[:7]))
    tasks_due = highlights.get("tasks_due", [])
    events_today = highlights.get("events_today", [])
    goals, milestones_by_goal = _fetch_goal_milestones()
    agenda = select_agenda(events_today, date)
    focus_goal = select_focus_goal(goals, milestones_by_goal)
    budgets, bills, subscriptions = _fetch_finance_dependencies()
    finance_snapshot = build_finance_snapshot(finance_summary, budgets, bills, subscriptions)
    priority_item = select_priority_item(tasks_due, events_today, date)
    summary_metrics = build_summary_metrics(
        tasks_due=tasks_due,
        habits_pending=highlights.get("habits_pending", []),
        water_status=highlights.get("water_status"),
        finance_snapshot=finance_snapshot,
        agenda=agenda,
    )
    return _api_response({
        "life_score": life_score,
        "highlights": highlights,
        "finance_summary": finance_summary,
        "priority_item": priority_item,
        "agenda": agenda,
        "focus_goal": focus_goal,
        "finance_snapshot": finance_snapshot,
        "summary_metrics": summary_metrics,
        "date": date,
    })


@frappe.whitelist()
def get_balance_report(month=None):
    _check_auth()
    if not month:
        month = today()[:7]

    finance_summary = _unwrap_response(get_finance_summary(month))
    life_score = _unwrap_response(get_life_score())
    tasks_payload = _unwrap_response(get_tasks(limit=500))
    habits_payload = _unwrap_response(get_habits(limit=500))
    habit_logs_payload = _unwrap_response(get_habit_logs(limit=500))
    sleep_payload = _unwrap_response(get_sleep_logs(limit=120))
    mindfulness_payload = _unwrap_response(get_mindfulness_sessions(limit=120))
    workout_payload = _unwrap_response(get_workout_logs(limit=120))

    task_rows = tasks_payload.get("tasks", []) if isinstance(tasks_payload, dict) else []
    habit_rows = habits_payload.get("habits", []) if isinstance(habits_payload, dict) else []
    habit_logs = habit_logs_payload.get("logs", []) if isinstance(habit_logs_payload, dict) else []
    sleep_logs = sleep_payload.get("sleep_logs", []) if isinstance(sleep_payload, dict) else []
    mindfulness_sessions = mindfulness_payload.get("sessions", []) if isinstance(mindfulness_payload, dict) else []
    workout_logs = workout_payload.get("workout_logs", []) if isinstance(workout_payload, dict) else []

    completed_tasks = [row for row in task_rows if row.get("status") in DONE_TASK_STATUSES]
    completed_habits = [row for row in habit_logs if row.get("status") in DONE_HABIT_STATUSES]

    avg_sleep = 0
    if sleep_logs:
        avg_sleep = round(sum(flt(row.get("duration_hours") or 0) for row in sleep_logs) / len(sleep_logs), 1)

    return _api_response({
        "month": month,
        "life_score": life_score,
        "finance": finance_summary,
        "productivity": {
            "task_count": len(task_rows),
            "completed_tasks": len(completed_tasks),
            "habit_count": len(habit_rows),
            "completed_habit_logs": len(completed_habits),
        },
        "health": {
            "average_sleep_hours": avg_sleep,
            "mindfulness_minutes": sum(cint(row.get("duration_minutes") or 0) for row in mindfulness_sessions),
            "workout_minutes": sum(cint(row.get("duration_minutes") or 0) for row in workout_logs),
        },
    })


# ─── Projects CRUD ─────────────────────────────────────────────

@frappe.whitelist()
def get_projects(limit=100, offset=0):
    _check_auth()
    rows = frappe.get_all(
        "Hambaft Project",
        filters=_owner_filter(),
        fields=["name"],
        limit_page_length=cint(limit),
        start=cint(offset),
        order_by="modified desc",
    )
    projects = [_project_to_frontend(frappe.get_doc("Hambaft Project", row.name)) for row in rows]
    return _api_response({"projects": projects})


@frappe.whitelist()
def create_project(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}
    data = _inject_note_blocks(data)
    doc = frappe.new_doc("Hambaft Project")
    doc.user = frappe.session.user
    doc.title = data.get("title")
    doc.description = data.get("description")
    doc.notes = data.get("notes")
    doc.goal = data.get("goal")
    doc.area = data.get("area")
    doc.parent_project = data.get("parent_project")
    doc.status = data.get("status") or "برنامه‌ریزی"
    doc.priority = data.get("priority") or "متوسط"
    doc.start_date = data.get("start_date")
    doc.target_date = data.get("target_date")
    doc.progress = flt(data.get("progress") or 0)
    doc.color = data.get("color")
    doc.icon = data.get("icon")
    doc.effort_type = data.get("effort_type")
    doc.estimated_hours = flt(data.get("estimated_hours")) if data.get("estimated_hours") else None
    doc.blocked_by_json = data.get("blocked_by_json")
    if data.get("note_blocks_json"):
        doc.note_blocks_json = data.get("note_blocks_json")
    # Do NOT write tasks to the child table — tasks are now linked via Task.project.
    # If tasks are provided, create real Task records instead.
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    # Create linked Task records for any tasks provided
    for task in data.get("tasks") or []:
        _create_project_task(doc.name, task)
    return _api_response({"project": _project_to_frontend(doc)})


@frappe.whitelist()
def update_project(name, data):
    _check_auth()
    _require_owner("Hambaft Project", name)
    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}
    data = _inject_note_blocks(data)
    doc = frappe.get_doc("Hambaft Project", name)
    doc.title = data.get("title", doc.title)
    doc.description = data.get("description", doc.description)
    doc.notes = data.get("notes", doc.notes)
    doc.goal = data.get("goal", doc.goal)
    doc.area = data.get("area", doc.area)
    doc.parent_project = data.get("parent_project", doc.parent_project)
    doc.status = data.get("status", doc.status)
    doc.priority = data.get("priority", doc.priority)
    doc.start_date = data.get("start_date", doc.start_date)
    doc.target_date = data.get("target_date", doc.target_date)
    doc.progress = flt(data.get("progress", doc.progress or 0))
    doc.color = data.get("color", doc.color)
    doc.icon = data.get("icon", doc.icon)
    doc.effort_type = data.get("effort_type", doc.effort_type)
    doc.estimated_hours = flt(data.get("estimated_hours")) if data.get("estimated_hours") is not None else doc.estimated_hours
    doc.blocked_by_json = data.get("blocked_by_json", doc.blocked_by_json)
    if data.get("note_blocks_json"):
        doc.note_blocks_json = data.get("note_blocks_json")
    # Tasks are no longer stored in the child table — they are real Task records.
    # When "tasks" is provided in the update, sync them with the Task doctype.
    if "tasks" in data:
        _sync_project_tasks(doc.name, data.get("tasks") or [], doc.user or frappe.session.user)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"project": _project_to_frontend(doc)})


@frappe.whitelist()
def delete_project(name):
    _check_auth()
    _require_owner("Hambaft Project", name)
    frappe.delete_doc("Hambaft Project", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Phase 3 CRUD ──────────────────────────────────────────────

@frappe.whitelist()
def get_documents(limit=100, offset=0):
    _check_auth()
    documents = frappe.get_all("Hambaft Document", filters=_owner_filter(), fields="*", limit_page_length=cint(limit), start=cint(offset), order_by="modified desc")
    for row in documents:
      row["tags"] = _loads_json(row.get("tags_json"), [])
    return _api_response({"documents": documents})


@frappe.whitelist()
def create_document(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}
    doc = frappe.new_doc("Hambaft Document")
    doc.user = frappe.session.user
    doc.title = data.get("title")
    doc.document_type = data.get("document_type") or "other"
    doc.description = data.get("description")
    doc.issued_by = data.get("issued_by")
    doc.issued_date = data.get("issued_date")
    doc.expiry_date = data.get("expiry_date")
    doc.tags_json = json.dumps(data.get("tags") or [], ensure_ascii=False)
    doc.notes = data.get("notes")
    doc.linked_bank_account_id = data.get("linked_bank_account_id")
    doc.linked_asset_id = data.get("linked_asset_id")
    doc.image_url = data.get("image_url")
    doc.reminder_date = data.get("reminder_date")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["tags"] = data.get("tags") or []
    return _api_response({"document": result})


@frappe.whitelist()
def update_document(name, data):
    _check_auth()
    _require_owner("Hambaft Document", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Document", name)
    for fieldname in ("title", "document_type", "description", "issued_by", "issued_date", "expiry_date", "notes", "linked_bank_account_id", "linked_asset_id", "image_url", "reminder_date"):
        if fieldname in data:
            setattr(doc, fieldname, data.get(fieldname))
    if "tags" in data:
        doc.tags_json = json.dumps(data.get("tags") or [], ensure_ascii=False)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["tags"] = _loads_json(doc.tags_json, [])
    return _api_response({"document": result})


@frappe.whitelist()
def delete_document(name):
    _check_auth()
    _require_owner("Hambaft Document", name)
    frappe.delete_doc("Hambaft Document", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_contacts(limit=200, offset=0):
    _check_auth()
    contacts = frappe.get_all("Hambaft Contact", filters=_owner_filter(), fields="*", limit_page_length=cint(limit), start=cint(offset), order_by="modified desc")
    for row in contacts:
        row["traits"] = _loads_json(row.get("traits_json"), [])
        row["interaction_logs"] = _loads_json(row.get("interaction_logs_json"), [])
    return _api_response({"contacts": contacts})


@frappe.whitelist()
def create_contact(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}
    doc = frappe.new_doc("Hambaft Contact")
    doc.user = frappe.session.user
    doc.full_name = data.get("full_name")
    doc.contact_category = data.get("contact_category") or "other"
    doc.birthday = data.get("birthday")
    doc.phone = data.get("phone")
    doc.email = data.get("email")
    doc.traits_json = json.dumps(data.get("traits") or [], ensure_ascii=False)
    doc.strengths = data.get("strengths")
    doc.hobbies = data.get("hobbies")
    doc.notes = data.get("notes")
    doc.last_interaction_date = data.get("last_interaction_date")
    doc.last_interaction_type = data.get("last_interaction_type")
    doc.interaction_logs_json = json.dumps(data.get("interaction_logs") or [], ensure_ascii=False)
    doc.relationship_score = cint(data.get("relationship_score") or 0)
    doc.closeness_tier = data.get("closeness_tier") or "acquaintance"
    doc.photo_url = data.get("photo_url")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["traits"] = data.get("traits") or []
    result["interaction_logs"] = data.get("interaction_logs") or []
    return _api_response({"contact": result})


@frappe.whitelist()
def update_contact(name, data):
    _check_auth()
    _require_owner("Hambaft Contact", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Contact", name)
    for fieldname in ("full_name", "contact_category", "birthday", "phone", "email", "strengths", "hobbies", "notes", "last_interaction_date", "last_interaction_type", "relationship_score", "closeness_tier", "photo_url"):
        if fieldname in data:
            setattr(doc, fieldname, data.get(fieldname))
    if "traits" in data:
        doc.traits_json = json.dumps(data.get("traits") or [], ensure_ascii=False)
    if "interaction_logs" in data:
        doc.interaction_logs_json = json.dumps(data.get("interaction_logs") or [], ensure_ascii=False)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["traits"] = _loads_json(doc.traits_json, [])
    result["interaction_logs"] = _loads_json(doc.interaction_logs_json, [])
    return _api_response({"contact": result})


@frappe.whitelist()
def delete_contact(name):
    _check_auth()
    _require_owner("Hambaft Contact", name)
    # Also delete all contact relations involving this contact
    try:
        for rel in frappe.get_all("Hambaft Contact Relation", filters={"user": frappe.session.user, "from_contact": name}):
            frappe.delete_doc("Hambaft Contact Relation", rel.name, ignore_permissions=True, force=True)
        for rel in frappe.get_all("Hambaft Contact Relation", filters={"user": frappe.session.user, "to_contact": name}):
            frappe.delete_doc("Hambaft Contact Relation", rel.name, ignore_permissions=True, force=True)
    except Exception:
        pass  # Relation tables may not exist yet
    # Also delete all contact-entity links involving this contact
    try:
        for link in frappe.get_all("Hambaft Contact Link", filters={"user": frappe.session.user, "contact": name}):
            frappe.delete_doc("Hambaft Contact Link", link.name, ignore_permissions=True, force=True)
    except Exception:
        pass  # Link table may not exist yet
    frappe.delete_doc("Hambaft Contact", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Contact Relations ─────────────────────────────────────────


def _contact_relations_table_exists():
    """Check if Hambaft Contact Relation table exists."""
    try:
        return frappe.db.exists("DocType", "Hambaft Contact Relation")
    except Exception:
        return False


def _compute_relationship_health(contact, relation_count=0, today_str=None):
    """Derive a lightweight relationship health state from existing data.

    Returns one of: "healthy", "needs_attention", "cold", "new"
    No fake AI — purely rule-based from last_interaction_date, closeness_tier,
    relation_count, and interaction frequency.
    """
    if not today_str:
        today_str = frappe.utils.today()

    last_date = contact.get("last_interaction_date")
    closeness = contact.get("closeness_tier") or "acquaintance"
    score = cint(contact.get("relationship_score") or 0)

    # Thresholds by closeness (days since last contact)
    thresholds = {"inner": 14, "outer": 45, "acquaintance": 90}
    threshold = thresholds.get(closeness, 90)

    if not last_date:
        # Never contacted
        if relation_count > 0:
            return "needs_attention"  # connected but never logged
        return "new"

    try:
        days_since = (frappe.utils.getdate(today_str) - frappe.utils.getdate(last_date)).days
    except Exception:
        days_since = 999

    if days_since <= threshold:
        return "healthy"
    elif days_since <= threshold * 2:
        return "needs_attention"
    else:
        return "cold"


@frappe.whitelist()
def get_contacts_summary():
    """Return enriched contact list with relation counts and derived health.

    Used by the Contacts UI for summary strip, badges, and filtering.
    """
    _check_auth()
    user = frappe.session.user

    contacts = frappe.get_all(
        "Hambaft Contact",
        filters={"user": user},
        fields=["name", "full_name", "contact_category", "closeness_tier",
                 "last_interaction_date", "relationship_score", "photo_url"],
        limit_page_length=500,
    )

    # Build relation counts per contact
    relation_counts = {}  # contact_id -> count
    relation_types_map = {}  # contact_id -> {type: count}
    if _contact_relations_table_exists():
        try:
            rels = frappe.get_all(
                "Hambaft Contact Relation",
                filters={"user": user, "status": "active"},
                fields=["from_contact", "to_contact", "relation_type"],
            )
            for rel in rels:
                for cid in (rel.from_contact, rel.to_contact):
                    relation_counts[cid] = relation_counts.get(cid, 0) + 1
                    if cid not in relation_types_map:
                        relation_types_map[cid] = {}
                    rtype = rel.relation_type or "custom"
                    relation_types_map[cid][rtype] = relation_types_map[cid].get(rtype, 0) + 1
        except Exception:
            pass

    today_str = frappe.utils.today()
    result = []
    for c in contacts:
        rc = relation_counts.get(c.name, 0)
        rt = relation_types_map.get(c.name, {})
        health = _compute_relationship_health(c, rc, today_str)
        result.append({
            "name": c.name,
            "full_name": c.full_name,
            "contact_category": c.contact_category,
            "closeness_tier": c.closeness_tier,
            "last_interaction_date": c.last_interaction_date,
            "relationship_score": c.relationship_score or 0,
            "photo_url": c.photo_url or None,
            "relation_count": rc,
            "relation_types": rt,
            "health": health,
        })

    return _api_response({"contacts": result})


@frappe.whitelist()
def get_contact_relations(contact_id):
    """Get all relations for a contact. Returns both outgoing and incoming relations.
    For mutual relations, only returns one record (from_contact < to_contact).
    Enriches with contact names for display.
    """
    _check_auth()
    user = frappe.session.user

    if not _contact_relations_table_exists():
        return _api_response({"relations": [], "contact_not_ready": True})

    # Fetch relations where this contact is either from or to
    relations = frappe.get_all(
        "Hambaft Contact Relation",
        filters={"user": user, "status": "active"},
        fields=["name", "from_contact", "to_contact", "relation_type", "directionality",
                 "strength_score", "since_date", "notes", "sort_order", "status"],
        order_by="sort_order asc, creation desc",
    )

    # Filter to only relations involving this contact
    result = []
    for rel in relations:
        if rel.from_contact != contact_id and rel.to_contact != contact_id:
            continue

        # Determine the "other" contact
        other_id = rel.to_contact if rel.from_contact == contact_id else rel.from_contact

        # Get other contact's name
        other_name = frappe.db.get_value("Hambaft Contact", other_id, "full_name") or other_id
        other_photo = frappe.db.get_value("Hambaft Contact", other_id, "photo_url") or None
        other_category = frappe.db.get_value("Hambaft Contact", other_id, "contact_category") or None

        # Determine direction label from the perspective of the active contact
        is_from = rel.from_contact == contact_id
        if rel.directionality == "mutual":
            direction_label = "mutual"
        elif is_from:
            direction_label = "outgoing"
        else:
            direction_label = "incoming"

        result.append({
            "name": rel.name,
            "from_contact": rel.from_contact,
            "to_contact": rel.to_contact,
            "relation_type": rel.relation_type,
            "directionality": rel.directionality,
            "direction_label": direction_label,
            "other_contact_id": other_id,
            "other_contact_name": other_name,
            "other_contact_photo": other_photo,
            "other_contact_category": other_category,
            "strength_score": rel.strength_score or 0,
            "since_date": rel.since_date or None,
            "notes": rel.notes or "",
            "sort_order": rel.sort_order or 0,
        })

    return _api_response({"relations": result})


@frappe.whitelist()
def create_contact_relation(data):
    """Create a relation between two contacts.
    Both contacts must belong to the same user.
    For mutual relations, also creates the reverse record for easy querying.
    """
    _check_auth()
    user = frappe.session.user

    if not _contact_relations_table_exists():
        return _api_response({"relation_name": None, "created": False, "contact_not_ready": True})

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    from_contact = data.get("from_contact")
    to_contact = data.get("to_contact")

    if not from_contact or not to_contact:
        frappe.throw("Both from_contact and to_contact are required.")

    if from_contact == to_contact:
        frappe.throw("A contact cannot be related to itself.")

    # Validate ownership of both contacts
    for cid in [from_contact, to_contact]:
        owner = frappe.db.get_value("Hambaft Contact", cid, "user")
        if owner != user:
            frappe.throw(f"Contact {cid} does not belong to you.", frappe.PermissionError)

    relation_type = data.get("relation_type") or "friend"
    directionality = data.get("directionality") or "mutual"
    strength_score = cint(data.get("strength_score") or 0)
    since_date = data.get("since_date") or None
    notes = data.get("notes") or ""

    doc = frappe.new_doc("Hambaft Contact Relation")
    doc.user = user
    doc.from_contact = from_contact
    doc.to_contact = to_contact
    doc.relation_type = relation_type
    doc.directionality = directionality
    doc.strength_score = strength_score
    doc.status = "active"
    doc.since_date = since_date
    doc.notes = notes
    doc.sort_order = cint(data.get("sort_order") or 0)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return _api_response({"relation_name": doc.name, "created": True})


@frappe.whitelist()
def update_contact_relation(name, data):
    """Update a contact relation."""
    _check_auth()
    _require_owner("Hambaft Contact Relation", name)

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    doc = frappe.get_doc("Hambaft Contact Relation", name)
    for fieldname in ("relation_type", "directionality", "strength_score", "since_date", "notes", "sort_order", "status"):
        if fieldname in data:
            setattr(doc, fieldname, data.get(fieldname))

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def delete_contact_relation(name):
    """Delete a contact relation."""
    _check_auth()
    _require_owner("Hambaft Contact Relation", name)
    frappe.delete_doc("Hambaft Contact Relation", name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Contact Links (contact ↔ entity) ──────────────────────────


def _contact_link_table_exists():
    """Check if Hambaft Contact Link table exists."""
    try:
        return frappe.db.exists("DocType", "Hambaft Contact Link")
    except Exception:
        return False


_ENTITY_DOCTYPE_MAP = {
    "goal": "Hambaft Goal",
    "project": "Hambaft Project",
    "task": "Hambaft Task",
    "occasion": "Hambaft Occasion",
    "document": "Hambaft Document",
    "finance": "Hambaft Finance Entry",
}


def _enrich_contact_link(link):
    """Add entity title and contact name to a link record."""
    result = {
        "name": link.name,
        "contact": link.contact,
        "entity_type": link.entity_type,
        "entity": link.entity,
        "role": link.role,
        "context_note": link.context_note or "",
        "status": link.status,
        "sort_order": link.sort_order or 0,
    }
    # Contact name
    result["contact_name"] = frappe.db.get_value("Hambaft Contact", link.contact, "full_name") or link.contact
    result["contact_photo"] = frappe.db.get_value("Hambaft Contact", link.contact, "photo_url") or None

    # Entity title
    target_dt = _ENTITY_DOCTYPE_MAP.get(link.entity_type)
    if target_dt and link.entity:
        title_field = "title" if target_dt != "Hambaft Finance Entry" else "title"
        result["entity_title"] = frappe.db.get_value(target_dt, link.entity, title_field) or link.entity
    else:
        result["entity_title"] = link.entity

    return result


@frappe.whitelist()
def get_contact_links(contact_id=None, entity_type=None, entity_id=None):
    """Get contact-entity links. Can filter by contact, entity, or both.
    If contact_id provided: returns all links for that contact.
    If entity_type+entity_id provided: returns all links for that entity.
    """
    _check_auth()
    user = frappe.session.user

    if not _contact_link_table_exists():
        return _api_response({"links": [], "contact_link_not_ready": True})

    filters = {"user": user, "status": "active"}
    if contact_id:
        filters["contact"] = contact_id
    if entity_type:
        filters["entity_type"] = entity_type
    if entity_id:
        filters["entity"] = entity_id

    links = frappe.get_all(
        "Hambaft Contact Link",
        filters=filters,
        fields=["name", "contact", "entity_type", "entity", "role", "context_note", "status", "sort_order"],
        order_by="sort_order asc, creation desc",
    )

    result = [_enrich_contact_link(link) for link in links]
    return _api_response({"links": result})


@frappe.whitelist()
def create_contact_link(data):
    """Create a link between a contact and an entity."""
    _check_auth()
    user = frappe.session.user

    if not _contact_link_table_exists():
        return _api_response({"link_name": None, "created": False, "contact_link_not_ready": True})

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    contact = data.get("contact")
    entity_type = data.get("entity_type")
    entity = data.get("entity")

    if not contact or not entity_type or not entity:
        frappe.throw("contact, entity_type, and entity are required.")

    # Validate contact ownership
    owner = frappe.db.get_value("Hambaft Contact", contact, "user")
    if owner != user:
        frappe.throw("Contact does not belong to you.", frappe.PermissionError)

    # Validate entity ownership
    target_dt = _ENTITY_DOCTYPE_MAP.get(entity_type)
    if not target_dt:
        frappe.throw(f"Unsupported entity type: {entity_type}")
    eowner = frappe.db.get_value(target_dt, entity, "user")
    if eowner != user:
        frappe.throw(f"Entity does not belong to you.", frappe.PermissionError)

    role = data.get("role") or "related_person"
    context_note = data.get("context_note") or ""

    doc = frappe.new_doc("Hambaft Contact Link")
    doc.user = user
    doc.contact = contact
    doc.entity_type = entity_type
    doc.entity = entity
    doc.role = role
    doc.context_note = context_note
    doc.status = "active"
    doc.sort_order = cint(data.get("sort_order") or 0)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return _api_response({"link_name": doc.name, "created": True})


@frappe.whitelist()
def update_contact_link(name, data):
    """Update a contact link."""
    _check_auth()
    _require_owner("Hambaft Contact Link", name)

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    doc = frappe.get_doc("Hambaft Contact Link", name)
    for fieldname in ("role", "context_note", "sort_order", "status"):
        if fieldname in data:
            setattr(doc, fieldname, data.get(fieldname))

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def delete_contact_link(name):
    """Delete a contact link."""
    _check_auth()
    _require_owner("Hambaft Contact Link", name)
    frappe.delete_doc("Hambaft Contact Link", name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_occasions(limit=200, offset=0):
    _check_auth()
    occasions = frappe.get_all("Hambaft Occasion", filters=_owner_filter(), fields="*", limit_page_length=cint(limit), start=cint(offset), order_by="occasion_date asc")
    return _api_response({"occasions": occasions})


@frappe.whitelist()
def create_occasion(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Hambaft Occasion")
    doc.user = frappe.session.user
    doc.title = data.get("title")
    doc.occasion_type = data.get("occasion_type") or "event"
    doc.occasion_date = data.get("occasion_date")
    doc.person = data.get("person")
    doc.recurrence_type = data.get("recurrence_type") or "once"
    doc.reminder_days_before = cint(data.get("reminder_days_before") or 0)
    doc.notes = data.get("notes")
    doc.color = data.get("color")
    doc.estimated_budget = flt(data.get("estimated_budget") or 0)
    doc.spent_amount = flt(data.get("spent_amount") or 0)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"occasion": doc.as_dict()})


@frappe.whitelist()
def update_occasion(name, data):
    _check_auth()
    _require_owner("Hambaft Occasion", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Occasion", name)
    doc.update(data)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"occasion": doc.as_dict()})


@frappe.whitelist()
def delete_occasion(name):
    _check_auth()
    _require_owner("Hambaft Occasion", name)
    frappe.delete_doc("Hambaft Occasion", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_sleep_logs(limit=200, offset=0):
    _check_auth()
    rows = frappe.get_all("Hambaft Sleep Log", filters=_owner_filter(), fields="*", limit_page_length=cint(limit), start=cint(offset), order_by="log_date desc")
    return _api_response({"sleep_logs": rows})


@frappe.whitelist()
def create_sleep_log(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Hambaft Sleep Log")
    doc.user = frappe.session.user
    doc.log_date = data.get("log_date")
    doc.sleep_time = data.get("sleep_time")
    doc.wake_time = data.get("wake_time")
    doc.duration_hours = flt(data.get("duration_hours") or 0)
    doc.quality = cint(data.get("quality") or 0)
    doc.energy_level = cint(data.get("energy_level") or 0)
    doc.notes = data.get("notes")
    doc.insert(ignore_permissions=True)
    _measurement_entry("ساعت خواب", doc.duration_hours, f"{doc.log_date} 00:00:00", "hour", doc.notes)
    frappe.db.commit()
    return _api_response({"sleep_log": doc.as_dict()})


@frappe.whitelist()
def update_sleep_log(name, data):
    _check_auth()
    _require_owner("Hambaft Sleep Log", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Sleep Log", name)
    doc.update(data)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"sleep_log": doc.as_dict()})


@frappe.whitelist()
def delete_sleep_log(name):
    _check_auth()
    _require_owner("Hambaft Sleep Log", name)
    frappe.delete_doc("Hambaft Sleep Log", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_mindfulness_sessions(limit=200, offset=0):
    _check_auth()
    rows = frappe.get_all("Hambaft Mindfulness Session", filters=_owner_filter(), fields="*", limit_page_length=cint(limit), start=cint(offset), order_by="session_date desc")
    return _api_response({"sessions": rows})


@frappe.whitelist()
def create_mindfulness_session(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Hambaft Mindfulness Session")
    doc.user = frappe.session.user
    doc.session_date = data.get("session_date")
    doc.session_type = data.get("session_type") or "meditation"
    doc.duration_minutes = cint(data.get("duration_minutes") or 0)
    doc.stress_before = cint(data.get("stress_before") or 0)
    doc.stress_after = cint(data.get("stress_after") or 0)
    doc.notes = data.get("notes")
    doc.insert(ignore_permissions=True)
    _measurement_entry("استرس", doc.stress_after, f"{doc.session_date} 00:00:00", "score", doc.notes)
    frappe.db.commit()
    return _api_response({"session": doc.as_dict()})


@frappe.whitelist()
def update_mindfulness_session(name, data):
    _check_auth()
    _require_owner("Hambaft Mindfulness Session", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Mindfulness Session", name)
    doc.update(data)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"session": doc.as_dict()})


@frappe.whitelist()
def delete_mindfulness_session(name):
    _check_auth()
    _require_owner("Hambaft Mindfulness Session", name)
    frappe.delete_doc("Hambaft Mindfulness Session", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_nutrition_logs(limit=200, offset=0):
    _check_auth()
    rows = frappe.get_all("Hambaft Nutrition Log", filters=_owner_filter(), fields="*", limit_page_length=cint(limit), start=cint(offset), order_by="log_date desc")
    return _api_response({"nutrition_logs": rows})


@frappe.whitelist()
def create_nutrition_log(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Hambaft Nutrition Log")
    doc.user = frappe.session.user
    doc.log_date = data.get("log_date")
    doc.log_time = data.get("log_time")
    doc.meal_type = data.get("meal_type") or "breakfast"
    doc.foods = data.get("foods")
    doc.calories = cint(data.get("calories") or 0)
    doc.protein = flt(data.get("protein") or 0)
    doc.carbs = flt(data.get("carbs") or 0)
    doc.fat = flt(data.get("fat") or 0)
    doc.water_glasses = flt(data.get("water_glasses") or 0)
    doc.notes = data.get("notes")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"nutrition_log": doc.as_dict()})


@frappe.whitelist()
def update_nutrition_log(name, data):
    _check_auth()
    _require_owner("Hambaft Nutrition Log", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Nutrition Log", name)
    doc.update(data)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"nutrition_log": doc.as_dict()})


@frappe.whitelist()
def delete_nutrition_log(name):
    _check_auth()
    _require_owner("Hambaft Nutrition Log", name)
    frappe.delete_doc("Hambaft Nutrition Log", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_workout_logs(limit=200, offset=0):
    _check_auth()
    rows = frappe.get_all("Hambaft Workout Log", filters=_owner_filter(), fields="*", limit_page_length=cint(limit), start=cint(offset), order_by="workout_date desc")
    for row in rows:
        row["gym_sets"] = _loads_json(row.get("gym_sets_json"), [])
    return _api_response({"workout_logs": rows})


@frappe.whitelist()
def create_workout_log(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Hambaft Workout Log")
    doc.user = frappe.session.user
    doc.workout_date = data.get("workout_date")
    doc.workout_type = data.get("workout_type") or "other"
    doc.cardio_type = data.get("cardio_type")
    doc.distance_km = flt(data.get("distance_km") or 0)
    doc.duration_minutes = cint(data.get("duration_minutes") or 0)
    doc.calories_burned = cint(data.get("calories_burned") or 0)
    doc.gym_sets_json = json.dumps(data.get("gym_sets") or [], ensure_ascii=False)
    doc.notes = data.get("notes")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["gym_sets"] = data.get("gym_sets") or []
    return _api_response({"workout_log": result})


@frappe.whitelist()
def update_workout_log(name, data):
    _check_auth()
    _require_owner("Hambaft Workout Log", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Workout Log", name)
    gym_sets = data.pop("gym_sets", None)
    if gym_sets is not None:
        data["gym_sets_json"] = json.dumps(gym_sets or [], ensure_ascii=False)
    doc.update(data)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["gym_sets"] = _loads_json(doc.get("gym_sets_json"), [])
    return _api_response({"workout_log": result})


@frappe.whitelist()
def delete_workout_log(name):
    _check_auth()
    _require_owner("Hambaft Workout Log", name)
    frappe.delete_doc("Hambaft Workout Log", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── AI Coach ──────────────────────────────────────────────────

@frappe.whitelist()
def ai_coach_chat(prompt, history=None, life_data=None, conversation_id=None):
    _check_auth()
    history = _loads_json(history, [])
    life_data = _loads_json(life_data, {})
    prompt = (prompt or "").strip()

    if not prompt:
        return _api_response({"text": "سوالی دریافت نشد.", "conversation_id": conversation_id})

    if conversation_id:
        conversation = frappe.get_doc("Hambaft AI Conversation", conversation_id)
    else:
        conversation = frappe.new_doc("Hambaft AI Conversation")
        conversation.user = frappe.session.user
        conversation.title = prompt[:120]
        conversation.ai_type = "کوچک_شخصی"
        conversation.status = "فعال"
        conversation.started_at = now_datetime()

    # Save user message
    user_msg = frappe.new_doc("Hambaft AI Message")
    user_msg.user = frappe.session.user
    user_msg.conversation = conversation.name if not conversation.is_new() else None
    user_msg.role = "کاربر"
    user_msg.content = prompt
    user_msg.timestamp = now_datetime()
    user_msg.model = "gemini-3.5"

    task_count = len(life_data.get("tasks") or [])
    habit_count = len(life_data.get("habits") or [])
    goal_count = len(life_data.get("goals") or [])
    transaction_count = len(life_data.get("transactions") or [])

    response_text = (
        f"تحلیل هم‌بافت:\n\n"
        f"- وظایف فعال/ثبت‌شده: {task_count}\n"
        f"- عادت‌ها: {habit_count}\n"
        f"- هدف‌ها: {goal_count}\n"
        f"- تراکنش‌های مالی: {transaction_count}\n\n"
        f"درخواست شما: {prompt}\n\n"
        f"پیشنهاد عملی:\n"
        f"1. اگر امروز کار نیمه‌تمام دارید، یک تسک با اولویت بالا را کامل کنید.\n"
        f"2. اگر عادت‌های فعال کم شده‌اند، روی یک عادت روزانه ثابت تمرکز کنید.\n"
        f"3. اگر هزینه‌ها زیاد شده‌اند، گزارش توازن و بخش مالی را مرور کنید."
    )

    conversation.last_message_at = now_datetime()
    conversation.context_summary = f"tasks={task_count}, habits={habit_count}, goals={goal_count}, tx={transaction_count}, history={len(history)}"
    if conversation.is_new():
        conversation.insert(ignore_permissions=True)
        # Update user message with the conversation ID now that it's saved
        user_msg.conversation = conversation.name
    else:
        conversation.save(ignore_permissions=True)

    # Save user message
    user_msg.conversation = conversation.name
    user_msg.insert(ignore_permissions=True)

    # Save AI response message
    ai_msg = frappe.new_doc("Hambaft AI Message")
    ai_msg.user = frappe.session.user
    ai_msg.conversation = conversation.name
    ai_msg.role = "دستیار"
    ai_msg.content = response_text
    ai_msg.timestamp = now_datetime()
    ai_msg.model = "gemini-3.5"
    ai_msg.insert(ignore_permissions=True)

    frappe.db.commit()
    return _api_response({"text": response_text, "conversation_id": conversation.name})


@frappe.whitelist()
def get_ai_conversations(limit=20):
    """Get recent AI conversations for the current user."""
    _check_auth()
    conversations = frappe.get_all(
        "Hambaft AI Conversation",
        filters={"user": frappe.session.user},
        fields=["name", "title", "ai_type", "status", "started_at", "last_message_at"],
        order_by="last_message_at desc",
        limit_page_length=limit,
    )
    return _api_response({"conversations": conversations})


@frappe.whitelist()
def get_ai_conversation_messages(conversation_id, limit=100):
    """Get all messages for a specific conversation."""
    _check_auth()
    # Verify ownership
    conv = frappe.get_doc("Hambaft AI Conversation", conversation_id)
    if conv.user != frappe.session.user:
        frappe.throw("عدم دسترسی", frappe.PermissionError)

    messages = frappe.get_all(
        "Hambaft AI Message",
        filters={"conversation": conversation_id},
        fields=["name", "role", "content", "timestamp", "model"],
        order_by="timestamp asc",
        limit_page_length=limit,
    )

    # Map role names to frontend-friendly values
    role_map = {"کاربر": "user", "دستیار": "model", "سیستم": "system"}
    for m in messages:
        m["role"] = role_map.get(m["role"], "system")
        # Convert datetime to time string for display
        if m.get("timestamp"):
            try:
                dt = getdate(m["timestamp"])
                m["timestamp"] = m["timestamp"].strftime("%H:%M") if hasattr(m["timestamp"], "strftime") else str(m["timestamp"])
            except Exception:
                pass

    return _api_response({"messages": messages, "conversation_id": conversation_id})


@frappe.whitelist()
def delete_ai_conversation(conversation_id):
    """Delete a conversation and all its messages."""
    _check_auth()
    conv = frappe.get_doc("Hambaft AI Conversation", conversation_id)
    if conv.user != frappe.session.user:
        frappe.throw("عدم دسترسی", frappe.PermissionError)

    # Delete all messages first
    frappe.db.delete("Hambaft AI Message", {"conversation": conversation_id})
    # Delete conversation
    frappe.delete_doc("Hambaft AI Conversation", conversation_id, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Scheduled Tasks ────────────────────────────────────────────

def daily_maintenance():
    """Daily maintenance: recreate recurring tasks, pre-compute scores."""
    check_overdue_bills()
    advance_subscription_billing()
    generate_recurring_transactions()
    generate_recurring_tasks()


def habit_streak_recalc():
    """Recalculate all active habit streaks."""
    habits = frappe.get_all("Habit", filters={"is_active": 1}, fields=["name"])
    for h in habits:
        try:
            logs = frappe.get_all("Habit Log",
                                  filters={"habit": h.name, "status": "انجام‌شده"},
                                  fields=["date"], order_by="date asc")
            if not logs:
                continue
            dates = sorted([getdate(l.date) for l in logs])
            best = 0
            current = 1
            for i in range(1, len(dates)):
                delta = (dates[i] - dates[i - 1]).days
                if delta == 1:
                    current += 1
                else:
                    best = max(best, current)
                    current = 1
            best = max(best, current)
            today_dt = getdate()
            last_date = dates[-1]
            if (today_dt - last_date).days <= 1:
                streak_current = current
            else:
                streak_current = 0
            frappe.db.set_value("Habit", h.name, "streak_current", streak_current)
            frappe.db.set_value("Habit", h.name, "streak_best", max(best, 0))
        except Exception:
            frappe.log_error(f"Error recalculating streak for habit {h.name}")
    frappe.db.commit()


def check_overdue_bills():
    overdue = frappe.get_all(
        "Hambaft Bill",
        filters={"due_date": ["<", today()], "status": "پیش‌رو"},
        fields=["name"],
        limit_page_length=500,
    )
    for row in overdue:
        frappe.db.set_value("Hambaft Bill", row.name, "status", "عقب‌افتاده")
    if overdue:
        frappe.db.commit()
    return {"updated": len(overdue)}


def advance_subscription_billing():
    subscriptions = frappe.get_all(
        "Hambaft Subscription",
        filters={"status": "فعال", "next_billing_date": ["<=", today()]},
        fields=["name", "subscription_name", "amount", "next_billing_date", "billing_cycle", "category", "account", "user"],
        limit_page_length=500,
    )
    created = 0
    for row in subscriptions:
        title = f"تمدید خودکار: {row.subscription_name}"
        exists = frappe.db.exists("Finance Entry", {"user": row.user, "title": title, "date": row.next_billing_date})
        if not exists:
            entry = frappe.new_doc("Finance Entry")
            entry.user = row.user
            entry.title = title
            entry.description = title
            entry.type = "هزینه"
            entry.amount = flt(row.amount or 0)
            entry.category = row.category or ""
            entry.account = row.account or ""
            entry.date = row.next_billing_date
            entry.insert(ignore_permissions=True)
            created += 1
        frappe.db.set_value("Hambaft Subscription", row.name, "next_billing_date", _advance_date(row.next_billing_date, row.billing_cycle))
    if subscriptions:
        frappe.db.commit()
    return {"subscriptions": len(subscriptions), "created_entries": created}


def _advance_task_due(date_value, rule):
    rule = (rule or "").strip().lower()
    base = getdate(date_value)
    if not rule or rule == "daily" or rule == "روزانه":
        return base + timedelta(days=1)
    if rule in {"weekly", "هفتگی"}:
        return base + timedelta(days=7)
    if rule in {"monthly", "ماهانه"}:
        return _advance_date(base, "ماهانه")
    if rule in {"yearly", "سالانه"}:
        return _advance_date(base, "سالانه")
    if rule.startswith("every_"):
        try:
            n = int(rule.split("_")[1])
            return base + timedelta(days=max(n, 1))
        except Exception:
            return base + timedelta(days=1)
    return base + timedelta(days=1)


@frappe.whitelist()
def generate_recurring_tasks():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    """Instantiate the next occurrence of each recurring task whose due_date
    has passed. Idempotent: skips when an instance already exists for the
    next occurrence date and user.
    """
    rows = frappe.get_all(
        "Task",
        filters={"is_recurring": 1, "due_date": ["<=", now_datetime()]},
        fields=[
            "name", "title", "description", "goal", "priority", "due_date",
            "estimated_minutes", "category", "recurrence_rule", "user",
            "status",
        ],
        limit_page_length=1000,
    )
    generated = 0
    for row in rows:
        if not row.due_date:
            continue
        next_date = _advance_task_due(row.due_date, row.recurrence_rule)
        next_dt = f"{next_date} {str(row.due_date)[11:19] or '09:00:00'}"
        duplicate = frappe.db.exists("Task", {
            "user": row.user,
            "title": row.title,
            "due_date": next_dt,
        })
        if duplicate:
            continue
        doc = frappe.new_doc("Task")
        doc.user = row.user
        doc.title = row.title
        doc.description = row.description
        doc.goal = row.goal
        doc.priority = row.priority
        doc.category = row.category
        doc.estimated_minutes = row.estimated_minutes
        doc.due_date = next_dt
        doc.status = "انجام‌نشده"
        doc.is_recurring = 1
        doc.recurrence_rule = row.recurrence_rule
        doc.insert(ignore_permissions=True)
        generated += 1
    if generated:
        frappe.db.commit()
    return {"generated": generated}


def generate_recurring_transactions():
    rows = frappe.get_all(
        "Finance Entry",
        filters={"is_recurring": 1, "date": ["<=", today()]},
        fields=["name", "title", "description", "type", "amount", "category", "account", "date", "recurrence_rule", "user"],
        limit_page_length=500,
    )
    generated = 0
    for row in rows:
        if not row.recurrence_rule:
            continue
        next_date = _advance_date(row.date, "ماهانه")
        duplicate = frappe.db.exists("Finance Entry", {"user": row.user, "title": row.title, "date": next_date})
        if duplicate:
            continue
        doc = frappe.new_doc("Finance Entry")
        doc.user = row.user
        doc.title = row.title
        doc.description = row.description
        doc.type = row.type
        doc.amount = row.amount
        doc.category = row.category
        doc.account = row.account
        doc.date = next_date
        doc.is_recurring = 1
        doc.recurrence_rule = row.recurrence_rule
        doc.insert(ignore_permissions=True)
        generated += 1
    if generated:
        frappe.db.commit()
    return {"generated": generated}


# ─── Review (Daily / Weekly / Monthly) ──────────────────────────────

@frappe.whitelist()
def get_daily_review(date=None):
    """Get the current user daily review for a given date."""
    from hambaft.hambaft.doctype.hambaft_daily_review.hambaft_daily_review import get_daily_review as _get
    return _get(date=date)

@frappe.whitelist()
def get_daily_reviews(from_date=None, to_date=None, limit=50, offset=0):
    """Get current user daily reviews within a date range."""
    from hambaft.hambaft.doctype.hambaft_daily_review.hambaft_daily_review import get_daily_reviews as _get
    return _get(from_date=from_date, to_date=to_date, limit=limit, offset=offset)

@frappe.whitelist()
def get_or_create_daily_review(date=None):
    """Get or create a daily review for the current user."""
    from hambaft.hambaft.doctype.hambaft_daily_review.hambaft_daily_review import get_or_create_daily_review as _get
    return _get(date=date)

@frappe.whitelist()
def get_weekly_review(week_start=None):
    """Get the current user weekly review."""
    from hambaft.hambaft.doctype.hambaft_weekly_review.hambaft_weekly_review import get_weekly_review as _get
    return _get(week_start=week_start)

@frappe.whitelist()
def get_weekly_reviews(limit=10, offset=0):
    """Get current user weekly reviews."""
    from hambaft.hambaft.doctype.hambaft_weekly_review.hambaft_weekly_review import get_weekly_reviews as _get
    return _get(limit=limit, offset=offset)

@frappe.whitelist()
def get_or_create_weekly_review(week_start=None):
    """Get or create a weekly review for the current user."""
    from hambaft.hambaft.doctype.hambaft_weekly_review.hambaft_weekly_review import get_or_create_weekly_review as _get
    return _get(week_start=week_start)

@frappe.whitelist()
def get_monthly_review(name=None, jalali_year=None, jalali_month=None):
    """Get a single monthly review."""
    from hambaft.hambaft.doctype.hambaft_monthly_review.hambaft_monthly_review import get_monthly_review as _get
    return _get(name=name, jalali_year=jalali_year, jalali_month=jalali_month)

@frappe.whitelist()
def get_monthly_reviews(jalali_year=None, jalali_month=None, limit=20, offset=0):
    """Get current user monthly reviews."""
    from hambaft.hambaft.doctype.hambaft_monthly_review.hambaft_monthly_review import get_monthly_reviews as _get
    return _get(jalali_year=jalali_year, jalali_month=jalali_month, limit=limit, offset=offset)

@frappe.whitelist()
def get_or_create_monthly_review(jalali_year, jalali_month):
    """Get or create a monthly review for the current user."""
    from hambaft.hambaft.doctype.hambaft_monthly_review.hambaft_monthly_review import get_or_create_monthly_review as _get
    return _get(jalali_year=jalali_year, jalali_month=jalali_month)

@frappe.whitelist()
def jalali_convert(date_str=None):
    """Convert a Gregorian date to Jalali. Utility endpoint."""
    if not date_str:
        date_str = today()
    from hambaft.hambaft.utils.jalali import to_jalali_string_persian, to_jalali_string, get_jalali_month_name, get_jalali_year
    return {
        "gregorian": date_str,
        "jalali": to_jalali_string(date_str),
        "jalali_persian": to_jalali_string_persian(date_str),
        "month_name": get_jalali_month_name(date_str),
        "jalali_year": get_jalali_year(date_str),
    }


# ─── Notion-like Note Pages CRUD ─────────────────────────────────

@frappe.whitelist()
def get_note_pages(limit=100, offset=0):
    _check_auth()
    try:
        rows = frappe.get_all(
            "Hambaft Note Page",
            filters=_owner_filter(),
            fields="*",
            limit_page_length=cint(limit),
            start=cint(offset),
            order_by="modified desc",
        )
    except frappe.DoesNotExistError:
        return _api_response({"pages": []})
    except Exception as e:
        # Table may not exist yet (migrate not run) — return empty gracefully
        frappe.logger().warning(f"get_note_pages failed: {e}")
        return _api_response({"pages": []})
    for row in rows:
        row["blocks"] = _loads_json(row.get("blocks_json"), [])
    return _api_response({"pages": rows})


@frappe.whitelist()
def get_note_page(name):
    _check_auth()
    doc = frappe.get_doc("Hambaft Note Page", name)
    result = doc.as_dict()
    result["blocks"] = _loads_json(doc.blocks_json, [])
    return _api_response({"page": result})


@frappe.whitelist()
def create_note_page(data=None):
    _check_auth()
    if data is None:
        data = {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            data = {}
    data = data or {}
    doc = frappe.new_doc("Hambaft Note Page")
    doc.user = frappe.session.user
    doc.title = data.get("title") or "بدون عنوان"
    doc.icon = data.get("icon")
    doc.cover = data.get("cover")
    parent_id = data.get("parentId")
    if parent_id and not frappe.db.exists("Hambaft Note Page", parent_id):
        frappe.logger().warning(f"create_note_page: parent {parent_id} not found; creating at root")
        parent_id = None
    doc.parent_page = parent_id
    doc.is_favorite = cint(data.get("isFavorite") or 0)
    doc.is_archived = cint(data.get("isArchived") or 0)
    doc.is_trashed = cint(data.get("isTrashed") or 0)
    doc.blocks_json = json.dumps(data.get("blocks") or [], ensure_ascii=False)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["blocks"] = _loads_json(doc.blocks_json, [])
    return _api_response({"page": result})


@frappe.whitelist()
def update_note_page(name, data=None):
    _check_auth()
    _require_owner("Hambaft Note Page", name)
    if data is None:
        data = {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, ValueError):
            data = {}
    doc = frappe.get_doc("Hambaft Note Page", name)
    if "title" in data:
        doc.title = data["title"]
    if "icon" in data:
        doc.icon = data["icon"]
    if "cover" in data:
        doc.cover = data["cover"]
    if "parentId" in data:
        pid = data["parentId"] or None
        if pid and not frappe.db.exists("Hambaft Note Page", pid):
            frappe.logger().warning(f"update_note_page: parent {pid} not found; clearing")
            pid = None
        doc.parent_page = pid
    if "isFavorite" in data:
        doc.is_favorite = cint(data["isFavorite"])
    if "isArchived" in data:
        doc.is_archived = cint(data["isArchived"])
    if "isTrashed" in data:
        doc.is_trashed = cint(data["isTrashed"])
    if "blocks" in data:
        doc.blocks_json = json.dumps(data["blocks"] or [], ensure_ascii=False)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    result = doc.as_dict()
    result["blocks"] = _loads_json(doc.blocks_json, [])
    return _api_response({"page": result})


@frappe.whitelist()
def delete_note_page(name):
    _check_auth()
    _require_owner("Hambaft Note Page", name)
    frappe.delete_doc("Hambaft Note Page", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Planner Task Sessions ──────────────────────────────────────

@frappe.whitelist()
def start_task_session(task):
    _check_auth()
    # Stop any existing active session for this user
    active = frappe.get_all(
        "Hambaft Task Session",
        filters={"user": frappe.session.user, "status": "active"},
        fields=["name"],
        limit_page_length=1,
    )
    for row in active:
        s = frappe.get_doc("Hambaft Task Session", row.name)
        s.status = "paused"
        s.stopped_at = now_datetime()
        if s.started_at:
            delta = datetime.strptime(str(s.stopped_at), "%Y-%m-%d %H:%M:%S.%f") - datetime.strptime(str(s.started_at), "%Y-%m-%d %H:%M:%S.%f")
            s.duration_minutes = int(delta.total_seconds() / 60)
        s.save(ignore_permissions=True)
    # Create new session
    doc = frappe.new_doc("Hambaft Task Session")
    doc.task = task
    doc.user = frappe.session.user
    doc.started_at = now_datetime()
    doc.status = "active"
    doc.duration_minutes = 0
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"session": doc.as_dict()})


@frappe.whitelist()
def stop_task_session(session_name):
    _check_auth()
    doc = frappe.get_doc("Hambaft Task Session", session_name)
    _require_owner("Hambaft Task Session", session_name)
    doc.status = "paused"
    doc.stopped_at = now_datetime()
    if doc.started_at:
        delta = datetime.strptime(str(doc.stopped_at), "%Y-%m-%d %H:%M:%S.%f") - datetime.strptime(str(doc.started_at), "%Y-%m-%d %H:%M:%S.%f")
        doc.duration_minutes = int(delta.total_seconds() / 60)
    doc.save(ignore_permissions=True)
    # Update task actual_minutes
    _update_task_actual_minutes(doc.task)
    frappe.db.commit()
    return _api_response({"session": doc.as_dict()})


@frappe.whitelist()
def resume_task_session(session_name):
    _check_auth()
    doc = frappe.get_doc("Hambaft Task Session", session_name)
    _require_owner("Hambaft Task Session", session_name)
    # Pause any other active session
    active = frappe.get_all(
        "Hambaft Task Session",
        filters={"user": frappe.session.user, "status": "active", "name": ["!=", session_name]},
        fields=["name"],
    )
    for row in active:
        s = frappe.get_doc("Hambaft Task Session", row.name)
        s.status = "paused"
        s.stopped_at = now_datetime()
        if s.started_at:
            delta = datetime.strptime(str(s.stopped_at), "%Y-%m-%d %H:%M:%S.%f") - datetime.strptime(str(s.started_at), "%Y-%m-%d %H:%M:%S.%f")
            s.duration_minutes = int(delta.total_seconds() / 60)
        s.save(ignore_permissions=True)
    doc.status = "active"
    doc.started_at = now_datetime()
    doc.stopped_at = None
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"session": doc.as_dict()})


@frappe.whitelist()
def finish_task_session(session_name):
    _check_auth()
    doc = frappe.get_doc("Hambaft Task Session", session_name)
    _require_owner("Hambaft Task Session", session_name)
    doc.status = "completed"
    doc.stopped_at = now_datetime()
    if doc.started_at:
        delta = datetime.strptime(str(doc.stopped_at), "%Y-%m-%d %H:%M:%S.%f") - datetime.strptime(str(doc.started_at), "%Y-%m-%d %H:%M:%S.%f")
        doc.duration_minutes = int(delta.total_seconds() / 60)
    doc.save(ignore_permissions=True)
    _update_task_actual_minutes(doc.task)
    frappe.db.commit()
    return _api_response({"session": doc.as_dict()})


def _update_task_actual_minutes(task_name):
    total = frappe.db.sql(
        "SELECT SUM(duration_minutes) FROM `tabHambaft Task Session` WHERE task=%s AND status IN ('paused', 'completed')",
        task_name
    )[0][0] or 0
    frappe.db.set_value("Task", task_name, "actual_minutes", cint(total))


@frappe.whitelist()
def get_task_sessions(task, limit=50):
    _check_auth()
    sessions = frappe.get_all(
        "Hambaft Task Session",
        filters={"task": task, "user": frappe.session.user},
        fields="*",
        limit_page_length=cint(limit),
        order_by="started_at desc",
    )
    return _api_response({"sessions": sessions})


@frappe.whitelist()
def get_active_session():
    _check_auth()
    active = frappe.get_all(
        "Hambaft Task Session",
        filters={"user": frappe.session.user, "status": "active"},
        fields="*",
        limit_page_length=1,
        order_by="started_at desc",
    )
    return _api_response({"session": active[0] if active else None})


# ─── Task Hierarchy ─────────────────────────────────────────────

@frappe.whitelist()
def get_task_children(parent_task):
    _check_auth()
    children = frappe.get_all(
        "Task",
        filters={"parent_task": parent_task, "user": frappe.session.user},
        fields="*",
        order_by="creation asc",
    )
    return _api_response({"tasks": children})


@frappe.whitelist()
def get_task_hierarchy(task_name):
    _check_auth()
    task = frappe.get_doc("Task", task_name).as_dict()
    task["children"] = frappe.get_all(
        "Task",
        filters={"parent_task": task_name, "user": frappe.session.user},
        fields="*",
        order_by="creation asc",
    )
    task["blocked_by"] = _loads_json(task.get("blocked_by_json"), [])
    return _api_response({"task": task})


# ─── Task Dependencies ──────────────────────────────────────────

@frappe.whitelist()
def add_task_dependency(task_name, depends_on_task):
    _check_auth()
    doc = frappe.get_doc("Task", task_name)
    _require_owner("Task", task_name)
    blocked = _loads_json(doc.blocked_by_json, [])
    if depends_on_task not in blocked:
        blocked.append(depends_on_task)
        doc.blocked_by_json = json.dumps(blocked, ensure_ascii=False)
        doc.save(ignore_permissions=True)
        frappe.db.commit()
    return _api_response({"blocked_by": blocked})


@frappe.whitelist()
def remove_task_dependency(task_name, depends_on_task):
    _check_auth()
    doc = frappe.get_doc("Task", task_name)
    _require_owner("Task", task_name)
    blocked = _loads_json(doc.blocked_by_json, [])
    if depends_on_task in blocked:
        blocked.remove(depends_on_task)
        doc.blocked_by_json = json.dumps(blocked, ensure_ascii=False)
        doc.save(ignore_permissions=True)
        frappe.db.commit()
    return _api_response({"blocked_by": blocked})


@frappe.whitelist()
def is_task_blocked(task_name):
    _check_auth()
    doc = frappe.get_doc("Task", task_name)
    blocked = _loads_json(doc.blocked_by_json, [])
    if not blocked:
        return _api_response({"blocked": False, "reason": None})
    # Check if any dependency is not done (support both English and Persian statuses)
    done_statuses = {"done", "completed", "انجام‌شده", "انجام شده"}
    for dep_id in blocked:
        dep = frappe.db.get_value("Task", dep_id, "status", as_dict=True)
        if dep and dep.status not in done_statuses:
            return _api_response({"blocked": True, "reason": f"تسک پیش‌نیاز {dep_id} هنوز انجام نشده"})
    return _api_response({"blocked": False, "reason": None})


@frappe.whitelist()
def get_task_impact_detail(task_name):
    """Return impact context for a task: linked project, goal, contribution info."""
    _check_auth()
    task = frappe.get_doc("Task", task_name)
    _require_owner("Task", task_name)

    result = {
        "task": task.name,
        "importance": task.importance or "عادی",
        "project": None,
        "goal": None,
    }

    # If task has a project, load project context
    if task.project:
        proj = frappe.db.get_value(
            "Hambaft Project", task.project,
            ["name", "title", "status", "progress", "goal"],
            as_dict=True,
        )
        if proj:
            result["project"] = {
                "name": proj.name,
                "title": proj.title,
                "status": proj.status,
                "progress": proj.progress or 0,
            }
            # If project has a goal, load goal context
            if proj.goal:
                goal = frappe.db.get_value(
                    "Goal", proj.goal,
                    ["name", "title", "health_state", "progress_percent", "progress_mode"],
                    as_dict=True,
                )
                if goal:
                    # Find the contribution_type of this project to its goal
                    contrib_type = "اجباری"
                    try:
                        goal_doc = frappe.get_doc("Goal", proj.goal)
                        for link in (goal_doc.get("linked_projects") or []):
                            if link.project == proj.name:
                                contrib_type = link.contribution_type or "اجباری"
                                break
                    except Exception:
                        pass
                    result["goal"] = {
                        "name": goal.name,
                        "title": goal.title,
                        "health_state": goal.health_state or "در_مسیر",
                        "progress_percent": goal.progress_percent or 0,
                        "progress_mode": goal.progress_mode or "",
                        "project_contribution_type": contrib_type,
                    }

    # Also check direct goal link on the task
    if task.goal and not result.get("goal"):
        goal = frappe.db.get_value(
            "Goal", task.goal,
            ["name", "title", "health_state", "progress_percent", "progress_mode"],
            as_dict=True,
        )
        if goal:
            result["goal"] = {
                "name": goal.name,
                "title": goal.title,
                "health_state": goal.health_state or "در_مسیر",
                "progress_percent": goal.progress_percent or 0,
                "progress_mode": goal.progress_mode or "",
            }

    # Blocked-by details
    blocked_by = _loads_json(task.blocked_by_json, [])
    if blocked_by:
        blocked_details = []
        done_statuses = {"done", "completed", "انجام‌شده", "انجام شده"}
        for dep_id in blocked_by:
            dep = frappe.db.get_value("Task", dep_id, ["name", "title", "status"], as_dict=True)
            if dep:
                blocked_details.append({
                    "name": dep.name,
                    "title": dep.title or dep.name,
                    "status": dep.status,
                    "is_done": dep.status in done_statuses,
                })
        result["blocked_by_details"] = blocked_details

    return _api_response(result)


@frappe.whitelist()
def update_task_importance(task_name, importance):
    """Quick update of task importance field."""
    _check_auth()
    _require_owner("Task", task_name)
    valid = {"عادی", "کلیدی", "نقطه‌عطف"}
    if importance not in valid:
        frappe.throw("اهمیت نامعتبر. مقادیر مجاز: عادی، کلیدی، نقطه‌عطف", frappe.ValidationError)
    frappe.db.set_value("Task", task_name, "importance", importance, update_modified=True)
    frappe.db.commit()
    return _api_response({"task": frappe.get_doc("Task", task_name).as_dict()})


@frappe.whitelist()
def resolve_blocked_tasks():
    """Return tasks that are blocked but whose blockers are all done — ready to unblock."""
    _check_auth()
    done_statuses = {"done", "completed", "انجام‌شده", "انجام شده"}
    # Find all tasks with blocked_by_json that are not done themselves
    blocked_tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "status": ["not in", list(done_statuses)],
            "blocked_by_json": ["is", "set"],
        },
        fields=["name", "title", "status", "blocked_by_json", "importance"],
        limit_page_length=200,
    )
    resolvable = []
    for t in blocked_tasks:
        deps = _loads_json(t.blocked_by_json, [])
        if not deps:
            continue
        all_done = True
        dep_details = []
        for dep_id in deps:
            dep_status = frappe.db.get_value("Task", dep_id, ["name", "title", "status"], as_dict=True)
            if dep_status and dep_status.status not in done_statuses:
                all_done = False
                dep_details.append({
                    "name": dep_status.name,
                    "title": dep_status.title or dep_status.name,
                    "status": dep_status.status,
                    "is_done": False,
                })
            elif dep_status:
                dep_details.append({
                    "name": dep_status.name,
                    "title": dep_status.title or dep_status.name,
                    "status": dep_status.status,
                    "is_done": True,
                })
        if all_done:
            resolvable.append({
                "task": t.name,
                "title": t.title or t.name,
                "status": t.status,
                "importance": t.importance or "عادی",
                "blockers": dep_details,
            })
    return _api_response({"resolvable_tasks": resolvable})


# ─── Planner Views ──────────────────────────────────────────────

@frappe.whitelist()
def get_planner_inbox(limit=100):
    _check_auth()
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "status": "inbox"},
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_planner_today(limit=100):
    _check_auth()
    today_str = today()
    # Tasks explicitly marked as today
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "status": "today"},
        fields="*",
        limit_page_length=cint(limit),
    )
    # Also include scheduled for today
    scheduled = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "scheduled_date": today_str, "status": ["not in", ["done", "dropped", "انجام‌شده"]]},
        fields="*",
        limit_page_length=cint(limit),
    )
    # Merge without duplicates
    seen = {t.name for t in tasks}
    for s in scheduled:
        if s.name not in seen:
            tasks.append(s)
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_planner_next(limit=100):
    _check_auth()
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "status": "next"},
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_planner_scheduled(from_date=None, to_date=None, limit=100):
    _check_auth()
    filters = {"user": frappe.session.user, "status": "not_started", "scheduled_date": ["is", "set"]}
    if from_date:
        filters["scheduled_date"] = [">=", from_date]
    if to_date:
        if isinstance(filters["scheduled_date"], list):
            filters["scheduled_date"] = ["between", [from_date, to_date]]
        else:
            filters["scheduled_date"] = ["<=", to_date]
    tasks = frappe.get_all(
        "Task",
        filters=filters,
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=lambda t: (t.get("scheduled_date") or "9999-12-31", t.get("scheduled_time") or "", _impact_sort_key(t)))
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_planner_someday(limit=100):
    _check_auth()
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "status": "someday"},
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def move_task_to_bucket(task_name, bucket):
    _check_auth()
    _require_owner("Task", task_name)
    # Support both English and Persian status names
    _PERSIAN_TO_ENGLISH = {
        "صندوق ورودی": "inbox", "شروع نشده": "not_started", "بعدی": "next",
        "امروز": "today", "در حال انجام": "in_progress", "انجام‌شده": "done",
        "انجام شده": "done", "متوقف": "on_hold", "روزی": "someday",
        "کنار گذاشته": "dropped", "done": "done", "inbox": "inbox",
        "not_started": "not_started", "next": "next", "today": "today",
        "in_progress": "in_progress", "on_hold": "on_hold", "someday": "someday",
        "dropped": "dropped",
    }
    normalized = _PERSIAN_TO_ENGLISH.get(bucket)
    if not normalized:
        frappe.throw("Invalid bucket", frappe.ValidationError)
    updates = {"status": normalized}
    if normalized == "done":
        updates["completed_on"] = now_datetime()
    elif normalized == "today":
        updates["scheduled_date"] = today()
    frappe.db.set_value("Task", task_name, updates, update_modified=True)
    frappe.db.commit()
    return _api_response({"task": frappe.get_doc("Task", task_name).as_dict()})


# ─── Task Status Transition ─────────────────────────────────────

@frappe.whitelist()
def transition_task_status(task_name, new_status):
    _check_auth()
    _require_owner("Task", task_name)
    _PERSIAN_TO_ENGLISH = {
        "صندوق ورودی": "inbox", "شروع نشده": "not_started", "بعدی": "next",
        "امروز": "today", "در حال انجام": "in_progress", "انجام‌شده": "done",
        "انجام شده": "done", "متوقف": "on_hold", "روزی": "someday",
        "کنار گذاشته": "dropped",
    }
    normalized = _PERSIAN_TO_ENGLISH.get(new_status, new_status)
    valid = {"inbox", "not_started", "next", "today", "in_progress", "done", "on_hold", "someday", "dropped"}
    if normalized not in valid:
        frappe.throw("Invalid status", frappe.ValidationError)
    updates = {"status": normalized}
    if normalized == "done":
        updates["completed_on"] = now_datetime()
    frappe.db.set_value("Task", task_name, updates, update_modified=True)
    frappe.db.commit()
    return _api_response({"task": frappe.get_doc("Task", task_name).as_dict()})


# ─── Area CRUD ─────────────────────────────────────────────────

@frappe.whitelist()
def create_area(data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}
    doc = frappe.new_doc("Hambaft Area")
    doc.user = frappe.session.user
    doc.title = data.get("title")
    doc.description = data.get("description")
    doc.color = data.get("color")
    doc.icon = data.get("icon")
    doc.status = data.get("status") or "فعال"
    doc.sort_order = cint(data.get("sort_order") or 0)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"area": doc.as_dict()})


@frappe.whitelist()
def update_area(name, data):
    _check_auth()
    _require_owner("Hambaft Area", name)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Hambaft Area", name)
    for fieldname in ("title", "description", "color", "icon", "status", "sort_order"):
        if fieldname in data:
            setattr(doc, fieldname, data.get(fieldname))
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"area": doc.as_dict()})


@frappe.whitelist()
def delete_area(name):
    _check_auth()
    _require_owner("Hambaft Area", name)
    frappe.delete_doc("Hambaft Area", name, ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def get_area_summary(name):
    """Get area with projects, tasks, tracked time aggregation."""
    _check_auth()
    _require_owner("Hambaft Area", name)
    doc = frappe.get_doc("Hambaft Area", name)
    return _api_response({"summary": doc.get_summary()})


@frappe.whitelist()
def get_areas_with_summaries(limit=50, offset=0):
    """Get all areas with summary data (projects, tasks, tracked time)."""
    _check_auth()
    areas = frappe.get_all("Hambaft Area", filters=_owner_filter(), fields="*",
                           limit_page_length=cint(limit), start=cint(offset),
                           order_by="sort_order asc, title asc")
    result = []
    for area_row in areas:
        doc = frappe.get_doc("Hambaft Area", area_row.name)
        summary = doc.get_summary()
        result.append(summary)
    return _api_response({"areas": result})


# ─── Project Dependencies ──────────────────────────────────────

@frappe.whitelist()
def add_project_dependency(project_name, depends_on_project):
    _check_auth()
    _require_owner("Hambaft Project", project_name)
    doc = frappe.get_doc("Hambaft Project", project_name)
    blocked = _loads_json(doc.blocked_by_json, [])
    if depends_on_project not in blocked:
        blocked.append(depends_on_project)
        doc.blocked_by_json = json.dumps(blocked, ensure_ascii=False)
        doc.save(ignore_permissions=True)
        frappe.db.commit()
    return _api_response({"blocked_by": blocked})


@frappe.whitelist()
def remove_project_dependency(project_name, depends_on_project):
    _check_auth()
    _require_owner("Hambaft Project", project_name)
    doc = frappe.get_doc("Hambaft Project", project_name)
    blocked = _loads_json(doc.blocked_by_json, [])
    if depends_on_project in blocked:
        blocked.remove(depends_on_project)
        doc.blocked_by_json = json.dumps(blocked, ensure_ascii=False)
        doc.save(ignore_permissions=True)
        frappe.db.commit()
    return _api_response({"blocked_by": blocked})


@frappe.whitelist()
def is_project_blocked(project_name):
    _check_auth()
    doc = frappe.get_doc("Hambaft Project", project_name)
    blocked, reason = doc.is_blocked()
    return _api_response({"blocked": blocked, "reason": reason})


@frappe.whitelist()
def get_project_subprojects(project_name):
    _check_auth()
    doc = frappe.get_doc("Hambaft Project", project_name)
    return _api_response({"projects": doc.get_subprojects()})


@frappe.whitelist()
def get_project_tracked_minutes(project_name):
    """Compute total tracked minutes for a project from its tasks' sessions."""
    _check_auth()
    task_names = frappe.get_all("Task", filters={"project": project_name}, fields=["name"])
    if not task_names:
        return _api_response({"tracked_minutes": 0})
    names = [t.name for t in task_names]
    total = frappe.db.sql(
        """SELECT COALESCE(SUM(duration_minutes), 0)
           FROM `tabHambaft Task Session`
           WHERE task IN (%s) AND status IN ('paused', 'completed')"""
        % ",".join(["%s"] * len(names)),
        names,
    )[0][0] or 0
    return _api_response({"tracked_minutes": int(total)})


# ─── Planner Calendar / Timeline Feeds ─────────────────────────

@frappe.whitelist()
def get_planner_daily_timeline(date=None):
    """Get tasks, sessions, time blocks, and events for a single day timeline view."""
    _check_auth()
    if not date:
        date = today()
    # Tasks scheduled for this date
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "scheduled_date": date,
            "status": ["not in", ["done", "dropped"]],
        },
        fields="*",
        order_by="scheduled_time asc",
    )
    # Tasks marked as today
    today_tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "status": "today"},
        fields="*",
        order_by="scheduled_time asc",
    )
    # Merge
    seen = {t.name for t in tasks}
    for t in today_tasks:
        if t.name not in seen:
            tasks.append(t)
    # Time blocks for this date
    time_blocks = frappe.get_all(
        "Hambaft Time Block",
        filters={"user": frappe.session.user, "block_date": date},
        fields="*",
        order_by="start_time asc",
    )
    # Active sessions
    active_session = frappe.get_all(
        "Hambaft Task Session",
        filters={"user": frappe.session.user, "status": "active"},
        fields="*",
        limit_page_length=1,
    )
    # Calendar events for this date
    events = _fetch_events_for_day(date, limit=50)
    return _api_response({
        "date": date,
        "tasks": tasks,
        "time_blocks": time_blocks,
        "active_session": active_session[0] if active_session else None,
        "events": events,
    })


@frappe.whitelist()
def get_planner_week(start_date=None):
    """Get tasks for a full week, grouped by date."""
    _check_auth()
    if not start_date:
        start_date = today()
    base = getdate(start_date)
    # Week: 7 days from start_date
    dates = [(base + timedelta(days=i)).isoformat() for i in range(7)]
    result = {}
    for d in dates:
        day_tasks = frappe.get_all(
            "Task",
            filters={
                "user": frappe.session.user,
                "scheduled_date": d,
                "status": ["not in", ["dropped"]],
            },
            fields="*",
            order_by="scheduled_time asc",
        )
        today_tasks = frappe.get_all(
            "Task",
            filters={"user": frappe.session.user, "status": "today"},
            fields="*",
        )
        seen = {t.name for t in day_tasks}
        for t in today_tasks:
            if t.name not in seen:
                day_tasks.append(t)
        result[d] = day_tasks
    return _api_response({"start_date": start_date, "days": result})


@frappe.whitelist()
def get_planner_month(year=None, month=None):
    """Get tasks for a full month, grouped by date."""
    _check_auth()
    if not year or not month:
        today_str = today()
        year = int(today_str[:4])
        month = int(today_str[5:7])
    year = cint(year)
    month = cint(month)
    # Get first and last day of month
    from_date = date(year, month, 1)
    if month == 12:
        to_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        to_date = date(year, month + 1, 1) - timedelta(days=1)
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "scheduled_date": ["between", [from_date.isoformat(), to_date.isoformat()]],
            "status": ["not in", ["dropped"]],
        },
        fields="*",
        order_by="scheduled_date asc, scheduled_time asc",
    )
    # Group by date
    result = {}
    for t in tasks:
        d = str(t.scheduled_date) if t.scheduled_date else None
        if d:
            result.setdefault(d, []).append(t)
    return _api_response({
        "year": year, "month": month,
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "days": result,
    })


# ─── Project Board (grouped by status) ─────────────────────────

@frappe.whitelist()
def get_project_board(project_name):
    """Get tasks for a project, grouped by planner status."""
    _check_auth()
    _require_owner("Hambaft Project", project_name)
    tasks = frappe.get_all(
        "Task",
        filters={"project": project_name, "user": frappe.session.user},
        fields="*",
        order_by="priority asc, scheduled_date asc",
    )
    # Group by status
    status_groups = {}
    status_order = ["inbox", "not_started", "next", "today", "in_progress", "on_hold", "someday", "done", "dropped"]
    for status in status_order:
        group = [t for t in tasks if t.status == status]
        if group:
            status_groups[status] = group
    # Include tasks without a recognized status
    for t in tasks:
        if t.status not in status_order:
            status_groups.setdefault(t.status or "inbox", []).append(t)
    project = frappe.get_doc("Hambaft Project", project_name)
    return _api_response({
        "project": _project_to_frontend(project),
        "status_groups": status_groups,
        "total_tasks": len(tasks),
        "completed_tasks": sum(1 for t in tasks if t.status == "done"),
    })


# ─── Projects by Area ──────────────────────────────────────────

@frappe.whitelist()
def get_projects_by_area(area_name):
    """Get all projects for an area with task/time aggregation."""
    _check_auth()
    _require_owner("Hambaft Area", area_name)
    projects = frappe.get_all(
        "Hambaft Project",
        filters={"area": area_name, "user": frappe.session.user},
        fields="*",
        order_by="title asc",
    )
    result = []
    for p in projects:
        task_count = frappe.db.count("Task", {"project": p.name, "user": frappe.session.user})
        done_count = frappe.db.count("Task", {"project": p.name, "user": frappe.session.user, "status": "done"})
        tracked = frappe.db.sql(
            """SELECT COALESCE(SUM(s.duration_minutes), 0)
               FROM `tabHambaft Task Session` s
               JOIN `tabTask` t ON t.name = s.task
               WHERE t.project=%s AND t.user=%s AND s.status IN ('paused', 'completed')""",
            (p.name, frappe.session.user),
        )[0][0] or 0
        p_dict = p if isinstance(p, dict) else p.__dict__
        p_dict["task_count"] = task_count
        p_dict["done_task_count"] = done_count
        p_dict["tracked_minutes"] = int(tracked)
        result.append(p_dict)
    return _api_response({"projects": result})


# ─── Tracked Time Rollups ──────────────────────────────────────

@frappe.whitelist()
def get_task_tracked_minutes(task_name):
    """Get total tracked minutes for a task from sessions (own + subtasks)."""
    _check_auth()
    # Verify task exists and belongs to user — use soft check
    if not frappe.db.exists("Task", {"name": task_name, "user": frappe.session.user}):
        # Fallback: if task has no user field set, allow anyway (legacy data)
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("Task {0} not found").format(task_name))
    # Own tracked minutes
    own = frappe.db.sql(
        "SELECT COALESCE(SUM(duration_minutes), 0) FROM `tabHambaft Task Session` WHERE task=%s AND status IN ('paused', 'completed')",
        task_name,
    )[0][0] or 0
    # Subtask tracked minutes
    subtask_names = frappe.get_all("Task", filters={"parent_task": task_name, "user": frappe.session.user}, pluck="name")
    subtask_total = 0
    if subtask_names:
        placeholders = ",".join(["%s"] * len(subtask_names))
        subtask_total = frappe.db.sql(
            f"SELECT COALESCE(SUM(duration_minutes), 0) FROM `tabHambaft Task Session` WHERE task IN ({placeholders}) AND status IN ('paused', 'completed')",
            tuple(subtask_names),
        )[0][0] or 0
    return _api_response({
        "tracked_minutes": int(own),
        "subtask_tracked_minutes": int(subtask_total),
        "total_tracked_minutes": int(own) + int(subtask_total),
    })


@frappe.whitelist()
def get_area_tracked_minutes(area_name):
    """Get total tracked minutes for an area (from direct area tasks)."""
    _check_auth()
    _require_owner("Hambaft Area", area_name)
    doc = frappe.get_doc("Hambaft Area", area_name)
    return _api_response({"tracked_minutes": doc.get_tracked_minutes()})


# ─── Task Attachments ────────────────────────────────────────────

@frappe.whitelist()
def get_task_attachments(task_name):
    """Get all files attached to a task."""
    _check_auth()
    # Soft owner check — support legacy tasks without user field
    if not frappe.db.exists("Task", {"name": task_name, "user": frappe.session.user}):
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("Task {0} not found").format(task_name))
    files = frappe.get_all(
        "File",
        filters={"attached_to_doctype": "Task", "attached_to_name": task_name},
        fields=["name", "file_name", "file_type", "file_url", "file_size", "is_private", "creation"],
        order_by="creation desc",
    )
    return _api_response({"attachments": files})


@frappe.whitelist()
def delete_task_attachment(file_name):
    """Delete an attached file from a task."""
    _check_auth()
    doc = frappe.get_doc("File", file_name)
    # Ensure the file is attached to a task owned by the user
    if doc.attached_to_doctype != "Task":
        frappe.throw(_("File is not attached to a task"), frappe.PermissionError)
    if not frappe.db.exists("Task", {"name": doc.attached_to_name, "user": frappe.session.user}):
        if not frappe.db.exists("Task", doc.attached_to_name):
            frappe.throw(_("Task not found"))
    # Also remove gallery pin order if exists
    frappe.db.delete("Hambaft Gallery Pin Order", {"file_name": file_name, "user": frappe.session.user})
    frappe.delete_doc("File", file_name)
    frappe.db.commit()
    return _api_response({"ok": True})


# ─── Gallery Domain (Hambaft Gallery Board / Section / Pin) ────

IMAGE_TYPES = ("image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp")

# Track whether gallery tables have been confirmed to exist
_gallery_tables_ok = None


def _gallery_tables_exist():
    """Check if gallery DocType tables exist in the database.
    Returns True if all three tables exist, False otherwise.
    Caches result for the request lifetime.
    """
    global _gallery_tables_ok
    if _gallery_tables_ok is not None:
        return _gallery_tables_ok
    try:
        tables = [t[0] for t in frappe.db.sql("SHOW TABLES LIKE 'tabHambaft Gallery%'")]
        required = {"tabHambaft Gallery Board", "tabHambaft Gallery Section", "tabHambaft Gallery Pin"}
        _gallery_tables_ok = required.issubset(set(tables))
    except Exception:
        _gallery_tables_ok = False
    return _gallery_tables_ok


def _get_or_create_board(goal_name, user):
    """Get existing board for a goal, or create one. Returns board name."""
    if not goal_name:
        return None
    existing = frappe.db.get_value("Hambaft Gallery Board", {"goal": goal_name, "user": user}, "name")
    if existing:
        return existing
    goal_title = frappe.db.get_value("Goal", goal_name, "title") or goal_name
    board = frappe.get_doc({
        "doctype": "Hambaft Gallery Board",
        "user": user,
        "goal": goal_name,
        "title": goal_title,
        "is_auto_created": 1,
        "sort_order": 0,
    })
    board.insert(ignore_permissions=True)
    frappe.db.commit()
    return board.name


def _get_or_create_section(project_name, board_name, user):
    """Get existing section for a project, or create one. Returns section name."""
    if not project_name or not board_name:
        return None
    existing = frappe.db.get_value("Hambaft Gallery Section", {"project": project_name, "user": user}, "name")
    if existing:
        # Make sure it's in the right board (project may have moved goals)
        frappe.db.set_value("Hambaft Gallery Section", existing, "board", board_name)
        return existing
    proj_title = frappe.db.get_value("Hambaft Project", project_name, "title") or project_name
    # Get max sort order
    max_sort = frappe.db.sql(
        "SELECT COALESCE(MAX(sort_order),-1) FROM `tabHambaft Gallery Section` WHERE board=%s", board_name
    )[0][0] or -1
    section = frappe.get_doc({
        "doctype": "Hambaft Gallery Section",
        "user": user,
        "board": board_name,
        "project": project_name,
        "title": proj_title,
        "sort_order": max_sort + 1,
        "is_auto_created": 1,
    })
    section.insert(ignore_permissions=True)
    frappe.db.commit()
    return section.name


def _resolve_pin_scope(source_doctype, source_name, user):
    """Given a source entity, resolve which board and section a pin should go to.
    Returns (board_name, section_name, is_orphan)."""
    board_goal = None
    section_project = None
    is_orphan = True

    if source_doctype == "Task" and source_name:
        task = frappe.db.get_value("Task", source_name, ["project", "goal"], as_dict=True)
        if not task:
            return (None, None, True)
        project_goal = None
        if task.project:
            project_goal = frappe.db.get_value("Hambaft Project", task.project, "goal")
        board_goal, section_project, is_orphan = plan_gallery_scope(
            source_doctype,
            source_name=source_name,
            task_goal=task.goal,
            task_project=task.project,
            project_goal=project_goal,
        )
    elif source_doctype == "Hambaft Project" and source_name:
        project_goal = frappe.db.get_value("Hambaft Project", source_name, "goal")
        board_goal, section_project, is_orphan = plan_gallery_scope(
            source_doctype,
            source_name=source_name,
            project_goal=project_goal,
        )
    elif source_doctype == "Goal" and source_name:
        board_goal, section_project, is_orphan = plan_gallery_scope(
            source_doctype,
            source_name=source_name,
        )

    if is_orphan or not board_goal:
        return (None, None, True)

    board_name = _get_or_create_board(board_goal, user)
    section_name = None
    if section_project:
        section_name = _get_or_create_section(section_project, board_name, user)
    return (board_name, section_name, False)


def _sync_pin_counts():
    """Update cached pin counts on boards and sections."""
    for board in frappe.get_all("Hambaft Gallery Board", fields=["name"]):
        count = frappe.db.sql(
            "SELECT COUNT(*) FROM `tabHambaft Gallery Pin` WHERE board=%s AND is_orphan=0",
            board.name
        )[0][0]
        sec_count = frappe.db.sql(
            "SELECT COUNT(*) FROM `tabHambaft Gallery Section` WHERE board=%s",
            board.name
        )[0][0]
        frappe.db.set_value("Hambaft Gallery Board", board.name, {
            "pin_count": count,
            "section_count": sec_count,
        })
    for section in frappe.get_all("Hambaft Gallery Section", fields=["name"]):
        count = frappe.db.sql(
            "SELECT COUNT(*) FROM `tabHambaft Gallery Pin` WHERE section=%s",
            section.name
        )[0][0]
        frappe.db.set_value("Hambaft Gallery Section", section.name, "pin_count", count)


def on_file_after_insert(doc, method=None):
    """Auto-create gallery pin when an image File is attached to Task/Hambaft Project/Goal.
    Hooked via doc_events in hooks.py.
    Silently skips if gallery tables don't exist yet.
    """
    if not doc or not is_gallery_image_file(
        getattr(doc, "file_type", None),
        getattr(doc, "file_name", None),
        getattr(doc, "file_url", None),
    ):
        return
    if not doc.attached_to_doctype or not doc.attached_to_name:
        return
    if doc.attached_to_doctype not in ("Task", "Hambaft Project", "Goal"):
        return
    # Skip if gallery tables don't exist yet (pre-migrate)
    if not _gallery_tables_exist():
        return

    # Determine user from the attached entity
    user = None
    try:
        if doc.attached_to_doctype == "Task":
            user = frappe.db.get_value("Task", doc.attached_to_name, "user")
        elif doc.attached_to_doctype == "Hambaft Project":
            user = frappe.db.get_value("Hambaft Project", doc.attached_to_name, "user")
        elif doc.attached_to_doctype == "Goal":
            user = frappe.db.get_value("Goal", doc.attached_to_name, "user")
    except Exception:
        return

    if not user:
        return

    # Skip if pin already exists for this file
    if frappe.db.exists("Hambaft Gallery Pin", {"file": doc.name, "user": user}):
        return

    try:
        previous_user = frappe.session.user
        if previous_user != user:
            frappe.set_user(user)
        create_gallery_pin(doc.name, source_doctype=doc.attached_to_doctype, source_name=doc.attached_to_name)
    except Exception as e:
        frappe.log_error(
            f"Gallery auto-pin failed for File {doc.name} attached to {doc.attached_to_doctype}/{doc.attached_to_name}: {e}",
            "Gallery Auto-Pin"
        )
    finally:
        if frappe.session.user != previous_user:
            frappe.set_user(previous_user)


def on_file_on_trash(doc, method=None):
    """Keep gallery pins in sync when a File is deleted outside gallery/task APIs."""
    if not doc or not getattr(doc, "name", None):
        return
    if not _gallery_tables_exist():
        return
    try:
        pin_names = frappe.get_all("Hambaft Gallery Pin", filters={"file": doc.name}, pluck="name")
        for pin_name in pin_names:
            frappe.delete_doc("Hambaft Gallery Pin", pin_name, force=True)
        if pin_names:
            _sync_pin_counts()
            frappe.db.commit()
    except Exception as e:
        frappe.log_error(f"Gallery file trash cleanup failed for File {doc.name}: {e}", "Gallery File Cleanup")


@frappe.whitelist()
def get_gallery_boards():
    """Get all gallery boards with sections and pins for the current user.
    Returns empty result if gallery tables don't exist yet (pre-migrate).
    """
    _check_auth()

    # Graceful: if tables don't exist yet, return empty instead of 417
    if not _gallery_tables_exist():
        return _api_response({"boards": [], "orphan_pins": [], "gallery_not_ready": True})

    user = frappe.session.user

    boards = frappe.get_all(
        "Hambaft Gallery Board",
        filters={"user": user},
        fields=["name", "title", "goal", "cover_file", "sort_order", "pin_count", "section_count"],
        order_by="sort_order asc, title asc",
    )

    result_boards = []
    for board in boards:
        # Sections
        sections = frappe.get_all(
            "Hambaft Gallery Section",
            filters={"board": board.name},
            fields=["name", "title", "project", "sort_order", "pin_count"],
            order_by="sort_order asc, title asc",
        )
        section_list = []
        for sec in sections:
            pins = frappe.get_all(
                "Hambaft Gallery Pin",
                filters={"section": sec.name},
                fields=["name", "file", "image_url", "image_name", "image_width", "image_height",
                         "source_type", "source_doctype", "source_name", "source_title",
                         "caption", "sort_order"],
                order_by="sort_order asc, creation asc",
            )
            sec["pins"] = pins
            section_list.append(sec)

        # Board-level pins (no section)
        board_pins = frappe.get_all(
            "Hambaft Gallery Pin",
            filters={"board": board.name, "section": ["is", "not set"], "is_orphan": 0},
            fields=["name", "file", "image_url", "image_name", "image_width", "image_height",
                     "source_type", "source_doctype", "source_name", "source_title",
                     "caption", "sort_order"],
            order_by="sort_order asc, creation asc",
        )

        # Cover image
        cover_url = None
        if board.cover_file:
            cover_url = frappe.db.get_value("File", board.cover_file, "file_url")
        if not cover_url and (board_pins or any(s["pins"] for s in section_list)):
            first_pin = board_pins[0] if board_pins else next((s["pins"][0] for s in section_list if s["pins"]), None)
            if first_pin:
                cover_url = first_pin.get("image_url")

        result_boards.append({
            "board_id": board.name,
            "board_title": board.title,
            "goal_id": board.goal,
            "cover_url": cover_url,
            "pin_count": board.pin_count or 0,
            "sections": section_list,
            "board_pins": board_pins,
        })

    # Orphan pins
    orphan_pins = frappe.get_all(
        "Hambaft Gallery Pin",
        filters={"user": user, "is_orphan": 1},
        fields=["name", "file", "image_url", "image_name", "image_width", "image_height",
                 "source_type", "source_doctype", "source_name", "source_title",
                 "caption", "sort_order"],
        order_by="sort_order asc, creation asc",
    )

    return _api_response({"boards": result_boards, "orphan_pins": orphan_pins})


@frappe.whitelist()
def get_gallery_board_detail(board_name):
    """Get a single board with full details."""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"board": None, "gallery_not_ready": True})
    user = frappe.session.user
    board = frappe.get_doc("Hambaft Gallery Board", board_name)
    if board.user != user:
        frappe.throw(_("Permission denied"), frappe.PermissionError)
    # Reuse get_gallery_boards logic for consistency
    data = get_gallery_boards()
    for b in (data.get("data", {}).get("boards") or []):
        if b["board_id"] == board_name:
            return _api_response({"board": b})
    return _api_response({"board": None})


@frappe.whitelist()
def create_gallery_pin(file_name, source_doctype=None, source_name=None, board=None, section=None, caption=None):
    """Create a gallery pin for an existing File record."""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"pin_name": None, "created": False, "gallery_not_ready": True})
    user = frappe.session.user

    # Verify file exists and belongs to user
    file_doc = frappe.get_doc("File", file_name)
    if not file_doc:
        frappe.throw(_("File not found"))

    # Prevent duplicate pins for same file+user
    existing = frappe.db.get_value("Hambaft Gallery Pin", {"file": file_name, "user": user}, "name")
    if existing:
        return _api_response({"pin_name": existing, "created": False})

    # Get image metadata
    image_url = file_doc.file_url or ""
    image_name = file_doc.file_name or ""

    # Resolve scope from source entity
    is_orphan = False
    if source_doctype and source_name:
        board_name, section_name, is_orphan = _resolve_pin_scope(source_doctype, source_name, user)
        source_title = frappe.db.get_value(source_doctype, source_name, "title") if frappe.db.exists(source_doctype, source_name) else ""
    else:
        board_name = board
        section_name = section
        source_title = ""
        is_orphan = not board_name

    # Get max sort order in scope
    if section_name:
        max_sort = frappe.db.sql(
            "SELECT COALESCE(MAX(sort_order),-1) FROM `tabHambaft Gallery Pin` WHERE section=%s AND user=%s",
            (section_name, user)
        )[0][0] or -1
    elif board_name:
        max_sort = frappe.db.sql(
            "SELECT COALESCE(MAX(sort_order),-1) FROM `tabHambaft Gallery Pin` WHERE board=%s AND section IS NULL AND user=%s",
            (board_name, user)
        )[0][0] or -1
    else:
        max_sort = frappe.db.sql(
            "SELECT COALESCE(MAX(sort_order),-1) FROM `tabHambaft Gallery Pin` WHERE is_orphan=1 AND user=%s",
            user
        )[0][0] or -1

    pin = frappe.get_doc({
        "doctype": "Hambaft Gallery Pin",
        "user": user,
        "file": file_name,
        "image_url": image_url,
        "image_name": image_name,
        "board": board_name or None,
        "section": section_name or None,
        "sort_order": max_sort + 1,
        "source_type": source_doctype or "direct",
        "source_doctype": source_doctype or None,
        "source_name": source_name or None,
        "source_title": source_title or "",
        "caption": caption or "",
        "is_orphan": 1 if is_orphan else 0,
    })
    pin.insert(ignore_permissions=True)
    frappe.db.commit()

    # Update board cover if no cover
    if board_name and not frappe.db.get_value("Hambaft Gallery Board", board_name, "cover_file"):
        frappe.db.set_value("Hambaft Gallery Board", board_name, "cover_file", file_name)

    _sync_pin_counts()
    return _api_response({"pin_name": pin.name, "created": True})


@frappe.whitelist()
def upload_gallery_image(filedata, filename, doctype=None, docname=None, board=None, section=None, caption=None):
    """Upload an image and create a gallery pin."""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"file_name": None, "gallery_not_ready": True})
    user = frappe.session.user
    import base64

    if "," in filedata:
        filedata = filedata.split(",")[1]
    decoded = base64.b64decode(filedata)

    # Determine attachment target
    attach_doctype = doctype or ""
    attach_docname = docname or ""

    if doctype == "Goal" and docname:
        if not frappe.db.exists("Goal", {"name": docname, "user": user}):
            frappe.throw(_("Permission denied"), frappe.PermissionError)
        attach_doctype = "Goal"
    elif doctype == "Hambaft Project" and docname:
        if not frappe.db.exists("Hambaft Project", {"name": docname, "user": user}):
            frappe.throw(_("Permission denied"), frappe.PermissionError)
    elif doctype == "Task" and docname:
        if not frappe.db.exists("Task", {"name": docname, "user": user}):
            frappe.throw(_("Permission denied"), frappe.PermissionError)

    # Create the File record
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": filename,
        "content": decoded,
        "is_private": 1,
    })
    if attach_doctype and attach_docname:
        file_doc.attached_to_doctype = attach_doctype
        file_doc.attached_to_name = attach_docname

    file_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    # Create the Pin
    source_doctype = attach_doctype if attach_doctype else None
    source_name = attach_docname if attach_docname else None

    # Override board/section if explicitly provided (for direct gallery upload)
    pin_board = board
    pin_section = section
    if not pin_board and source_doctype and source_name:
        pin_board, pin_section, _ = _resolve_pin_scope(source_doctype, source_name, user)

    pin_result = create_gallery_pin(
        file_name=file_doc.name,
        source_doctype=source_doctype,
        source_name=source_name,
        board=pin_board,
        section=pin_section,
        caption=caption,
    )

    return _api_response({
        "file_name": file_doc.name,
        "file_url": file_doc.file_url,
        "file_size": file_doc.file_size,
        "pin_name": pin_result.get("data", {}).get("pin_name") if isinstance(pin_result, dict) else None,
    })


@frappe.whitelist()
def move_gallery_pin(pin_name, board=None, section=None):
    """Move a pin to a different board/section."""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"ok": False, "gallery_not_ready": True})
    user = frappe.session.user
    pin = frappe.get_doc("Hambaft Gallery Pin", pin_name)
    if pin.user != user:
        frappe.throw(_("Permission denied"), frappe.PermissionError)

    updates = {}
    if board is not None:
        updates["board"] = board or None
        updates["is_orphan"] = 0 if board else 1
    if section is not None:
        updates["section"] = section or None

    if updates:
        frappe.db.set_value("Hambaft Gallery Pin", pin_name, updates)
        # Reset sort order to end
        if section:
            max_sort = frappe.db.sql(
                "SELECT COALESCE(MAX(sort_order),-1) FROM `tabHambaft Gallery Pin` WHERE section=%s AND user=%s AND name!=%s",
                (section, user, pin_name)
            )[0][0] or -1
            frappe.db.set_value("Hambaft Gallery Pin", pin_name, "sort_order", max_sort + 1)

    frappe.db.commit()
    _sync_pin_counts()
    return _api_response({"ok": True})


@frappe.whitelist()
def reorder_gallery_pins(items):
    """Reorder pins. items = [{ pin_name, sort_order }]"""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"ok": False, "gallery_not_ready": True})
    user = frappe.session.user
    if isinstance(items, str):
        items = json.loads(items)
    for item in items:
        pin_name = item.get("pin_name") or item.get("file_name")
        sort_order = cint(item.get("sort_order", 0))
        if not pin_name:
            continue
        # Verify ownership
        pin_user = frappe.db.get_value("Hambaft Gallery Pin", pin_name, "user")
        if pin_user != user:
            continue
        frappe.db.set_value("Hambaft Gallery Pin", pin_name, "sort_order", sort_order)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def reorder_gallery_sections(board_name, section_order):
    """Reorder sections within a board. section_order = [section_name, ...]"""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"ok": False, "gallery_not_ready": True})
    user = frappe.session.user
    if isinstance(section_order, str):
        section_order = json.loads(section_order)
    for idx, section_name in enumerate(section_order):
        sec_user = frappe.db.get_value("Hambaft Gallery Section", section_name, "user")
        if sec_user != user:
            continue
        frappe.db.set_value("Hambaft Gallery Section", section_name, "sort_order", idx)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def update_gallery_pin_meta(pin_name, caption=None, note=None):
    """Update pin metadata (caption, note)."""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"ok": False, "gallery_not_ready": True})
    user = frappe.session.user
    pin_user = frappe.db.get_value("Hambaft Gallery Pin", pin_name, "user")
    if pin_user != user:
        frappe.throw(_("Permission denied"), frappe.PermissionError)
    updates = {}
    if caption is not None:
        updates["caption"] = caption
    if note is not None:
        updates["note"] = note
    if updates:
        frappe.db.set_value("Hambaft Gallery Pin", pin_name, updates)
    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def delete_gallery_pin(pin_name, delete_file=False):
    """Delete a gallery pin. By default, only removes the pin (detach).
    If delete_file=True, also deletes the source File record (requires explicit opt-in).
    """
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"ok": False, "gallery_not_ready": True})
    user = frappe.session.user
    pin = frappe.get_doc("Hambaft Gallery Pin", pin_name)
    if pin.user != user:
        frappe.throw(_("Permission denied"), frappe.PermissionError)

    file_name = pin.file
    board_name = pin.board

    frappe.delete_doc("Hambaft Gallery Pin", pin_name, force=True)

    # Only delete the File if explicitly requested
    if delete_file and file_name and frappe.db.exists("File", file_name):
        try:
            frappe.delete_doc("File", file_name, force=True)
        except Exception as e:
            frappe.log_error(f"Failed to delete File {file_name} during pin deletion: {e}", "Gallery Pin Delete")

    frappe.db.commit()
    _sync_pin_counts()
    return _api_response({"ok": True, "file_deleted": bool(delete_file and file_name)})


@frappe.whitelist()
def get_task_attachments(task_name):
    """Get all files attached to a task, with gallery pin info."""
    _check_auth()
    user = frappe.session.user
    # Soft owner check
    if not frappe.db.exists("Task", {"name": task_name, "user": user}):
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("Task {0} not found").format(task_name))

    files = frappe.get_all(
        "File",
        filters={"attached_to_doctype": "Task", "attached_to_name": task_name},
        fields=["name", "file_name", "file_type", "file_url", "file_size", "is_private", "creation"],
        order_by="creation desc",
    )

    # Enrich with sort order from gallery pins (only if tables exist)
    gallery_ok = _gallery_tables_exist()
    for f in files:
        if gallery_ok:
            try:
                pin = frappe.db.get_value("Hambaft Gallery Pin",
                    {"file": f.name, "user": user},
                    ["name", "sort_order", "caption", "board", "section"], as_dict=True)
                if pin:
                    f["pin_name"] = pin.name
                    f["sort_order"] = pin.sort_order
                    f["caption"] = pin.caption
                    f["board_id"] = pin.board or ""
                    f["section_id"] = pin.section or ""
                    f["board_title"] = frappe.db.get_value("Hambaft Gallery Board", pin.board, "title") if pin.board else ""
                    f["section_title"] = frappe.db.get_value("Hambaft Gallery Section", pin.section, "title") if pin.section else ""
                else:
                    f["pin_name"] = None
                    f["sort_order"] = 0
                    f["caption"] = ""
                    f["board_id"] = ""
                    f["section_id"] = ""
                    f["board_title"] = ""
                    f["section_title"] = ""
            except Exception:
                f["pin_name"] = None
                f["sort_order"] = 0
                f["caption"] = ""
                f["board_id"] = ""
                f["section_id"] = ""
                f["board_title"] = ""
                f["section_title"] = ""
        else:
            f["pin_name"] = None
            f["sort_order"] = 0
            f["caption"] = ""
            f["board_id"] = ""
            f["section_id"] = ""
            f["board_title"] = ""
            f["section_title"] = ""

    # Sort by sort_order then creation
    files.sort(key=lambda x: (x.get("sort_order", 0), x.get("creation", "")))
    return _api_response({"attachments": files})


@frappe.whitelist()
def reorder_task_attachments(task_name, items):
    """Reorder task attachment pins. items = [{ file_name, sort_order }]"""
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"ok": True})  # silently skip if no gallery yet
    user = frappe.session.user
    if isinstance(items, str):
        items = json.loads(items)

    for item in items:
        file_name = item.get("file_name")
        sort_order = cint(item.get("sort_order", 0))
        if not file_name:
            continue
        # Ensure pin exists, create if not
        try:
            pin = frappe.db.get_value("Hambaft Gallery Pin",
                {"file": file_name, "user": user}, "name")
            if pin:
                frappe.db.set_value("Hambaft Gallery Pin", pin, "sort_order", sort_order)
            else:
                # Auto-create pin for this task file
                create_gallery_pin(file_name, source_doctype="Task", source_name=task_name)
        except Exception:
            pass  # Gallery not ready yet

    frappe.db.commit()
    return _api_response({"ok": True})


@frappe.whitelist()
def delete_task_attachment(file_name):
    """Delete an attached file and its gallery pin."""
    _check_auth()
    user = frappe.session.user
    if not frappe.db.exists("File", file_name):
        frappe.throw(_("File not found"))

    doc = frappe.get_doc("File", file_name)
    # Soft owner check
    if doc.attached_to_doctype == "Task":
        if not frappe.db.exists("Task", {"name": doc.attached_to_name, "user": user}):
            if not frappe.db.exists("Task", doc.attached_to_name):
                frappe.throw(_("Task not found"))

    # Remove gallery pin (only if tables exist)
    if _gallery_tables_exist():
        try:
            frappe.db.delete("Hambaft Gallery Pin", {"file": file_name, "user": user})
        except Exception:
            pass
    # Remove old Pin Order records too (migration compat)
    try:
        frappe.db.delete("Hambaft Gallery Pin Order", {"file_name": file_name, "user": user})
    except Exception:
        pass
    frappe.delete_doc("File", file_name, force=True)
    frappe.db.commit()
    if _gallery_tables_exist():
        try:
            _sync_pin_counts()
        except Exception:
            pass
    return _api_response({"ok": True})


@frappe.whitelist()
def sync_gallery_from_existing_files():
    """Idempotent migration: sync all existing image attachments into gallery domain.
    Creates boards, sections, and pins for every image File attached to user's entities.
    Returns detailed report of synced and failed items.
    """
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"synced": 0, "skipped": 0, "errors": [], "total_files": 0, "gallery_not_ready": True,
                              "message": "Gallery tables don't exist yet. Run bench migrate first."})
    user = frappe.session.user
    count = 0
    errors = []
    skipped = 0

    # 1. Task images
    task_files = frappe.db.sql("""
        SELECT f.name, f.file_type, f.file_name, f.file_url,
               t.name as task_name, t.title as task_title,
               t.project, t.goal
        FROM `tabFile` f
        JOIN `tabTask` t ON f.attached_to_name = t.name AND f.attached_to_doctype = 'Task'
        WHERE t.user = %s
    """, user, as_dict=True)

    for row in task_files:
        if not is_gallery_image_file(row.file_type, row.file_name, row.file_url):
            continue
        if frappe.db.exists("Hambaft Gallery Pin", {"file": row.name, "user": user}):
            skipped += 1
            continue
        try:
            create_gallery_pin(row.name, source_doctype="Task", source_name=row.task_name)
            count += 1
        except Exception as e:
            errors.append({"file": row.name, "source": f"Task/{row.task_name}", "error": str(e)})

    # 2. Project images
    proj_files = frappe.db.sql("""
        SELECT f.name, f.file_type, f.file_name, f.file_url,
               p.name as proj_name, p.title as proj_title, p.goal
        FROM `tabFile` f
        JOIN `tabHambaft Project` p ON f.attached_to_name = p.name AND f.attached_to_doctype = 'Hambaft Project'
        WHERE p.user = %s
    """, user, as_dict=True)

    for row in proj_files:
        if not is_gallery_image_file(row.file_type, row.file_name, row.file_url):
            continue
        if frappe.db.exists("Hambaft Gallery Pin", {"file": row.name, "user": user}):
            skipped += 1
            continue
        try:
            create_gallery_pin(row.name, source_doctype="Hambaft Project", source_name=row.proj_name)
            count += 1
        except Exception as e:
            errors.append({"file": row.name, "source": f"Hambaft Project/{row.proj_name}", "error": str(e)})

    # 3. Goal images
    goal_files = frappe.db.sql("""
        SELECT f.name, f.file_type, f.file_name, f.file_url,
               g.name as goal_name, g.title as goal_title
        FROM `tabFile` f
        JOIN `tabGoal` g ON f.attached_to_name = g.name AND f.attached_to_doctype = 'Goal'
        WHERE g.user = %s
    """, user, as_dict=True)

    for row in goal_files:
        if not is_gallery_image_file(row.file_type, row.file_name, row.file_url):
            continue
        if frappe.db.exists("Hambaft Gallery Pin", {"file": row.name, "user": user}):
            skipped += 1
            continue
        try:
            create_gallery_pin(row.name, source_doctype="Goal", source_name=row.goal_name)
            count += 1
        except Exception as e:
            errors.append({"file": row.name, "source": f"Goal/{row.goal_name}", "error": str(e)})

    _sync_pin_counts()
    frappe.db.commit()
    return _api_response({"synced": count, "skipped": skipped, "errors": errors, "total_files": len(task_files) + len(proj_files) + len(goal_files)})


@frappe.whitelist()
def migrate_pin_order_to_domain():
    """One-time migration: convert old Hambaft Gallery Pin Order records to new domain model.
    Idempotent — skips if pin already exists for the same file+user.
    """
    _check_auth()
    if not _gallery_tables_exist():
        return _api_response({"migrated": 0, "total_old": 0, "errors": [], "gallery_not_ready": True,
                              "message": "Gallery tables don't exist yet. Run bench migrate first."})
    user = frappe.session.user

    old_records = frappe.get_all("Hambaft Gallery Pin Order",
        filters={"user": user},
        fields=["name", "file_name", "file_url", "scope_type", "scope_id",
                "source_type", "source_id", "source_title", "sort_order", "image_name"])

    count = 0
    errors = []
    for old in old_records:
        if not old.file_name or old.file_name == "section_order_placeholder":
            continue
        # Skip if pin already exists
        if frappe.db.exists("Hambaft Gallery Pin", {"file": old.file_name, "user": user}):
            continue

        # Determine board/section from scope
        board_name = None
        section_name = None
        is_orphan = old.scope_type == "orphan"

        if old.scope_type == "board" and old.scope_id:
            board_name = _get_or_create_board(old.scope_id, user)
        elif old.scope_type == "section" and old.scope_id:
            # scope_id is project name, find its board
            goal = frappe.db.get_value("Hambaft Project", old.scope_id, "goal")
            if goal:
                board_name = _get_or_create_board(goal, user)
                section_name = _get_or_create_section(old.scope_id, board_name, user)
            else:
                is_orphan = True

        try:
            pin = frappe.get_doc({
                "doctype": "Hambaft Gallery Pin",
                "user": user,
                "file": old.file_name,
                "image_url": old.file_url or "",
                "image_name": old.image_name or "",
                "board": board_name,
                "section": section_name,
                "sort_order": old.sort_order or 0,
                "source_type": old.source_type or "direct",
                "source_doctype": old.source_type if old.source_type in ("Task", "Hambaft Project", "Goal") else None,
                "source_name": old.source_id or None,
                "source_title": old.source_title or "",
                "is_orphan": 1 if is_orphan else 0,
            })
            pin.insert(ignore_permissions=True)
            count += 1
        except Exception as e:
            errors.append({"file": old.file_name, "source_type": old.source_type, "source_id": old.source_id, "error": str(e)})

    _sync_pin_counts()
    frappe.db.commit()
    return _api_response({"migrated": count, "total_old": len(old_records), "errors": errors})

# ─── Planner Board Views ───────────────────────────────────────

@frappe.whitelist()
def get_tasks_by_project(limit=100):
    """Get all tasks grouped by project for board view, enriched with impact data."""
    _check_auth()
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "status": ["not in", ["dropped"]]},
        fields="*",
        limit_page_length=cint(limit),
        order_by="project asc, priority asc",
    )
    # Enrich with impact data
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    # Group by project
    by_project = {}
    for t in enriched:
        key = t.get("project") or "no_project"
        by_project.setdefault(key, []).append(t)
    return _api_response({"by_project": by_project})


@frappe.whitelist()
def get_tasks_grouped_by_status(limit=200):
    """Get all tasks grouped by status for board view, enriched with impact data."""
    _check_auth()
    tasks = frappe.get_all(
        "Task",
        filters={"user": frappe.session.user, "status": ["not in", ["dropped"]]},
        fields="*",
        limit_page_length=cint(limit),
        order_by="status asc, priority asc, scheduled_date asc",
    )
    # Enrich with impact data
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    status_groups = {}
    status_order = ["inbox", "not_started", "next", "today", "in_progress", "on_hold", "someday", "done"]
    for status in status_order:
        group = [t for t in enriched if t.get("status") == status]
        if group:
            status_groups[status] = group
    return _api_response({"status_groups": status_groups})


# ─── Advanced Goal APIs ──────────────────────────────────────

def _goal_to_frontend(doc):
    """Convert a Goal document to a frontend-friendly dict."""
    linked_habits = []
    for row in doc.get("linked_habits") or []:
        habit_title = frappe.db.get_value("Habit", row.habit, "title") or row.habit
        linked_habits.append({
            "habit": row.habit,
            "habit_title": habit_title,
            "contribution_type": row.contribution_type,
            "weight": row.weight or 100,
            "period": row.period,
            "target_value": row.target_value,
            "cap_value": row.cap_value,
            "is_negative": row.is_negative,
            "notes": row.notes or "",
        })

    linked_finance = []
    for row in doc.get("linked_finance_accounts") or []:
        account_name = frappe.db.get_value("Hambaft Finance Account", row.finance_account, "account_name") if row.finance_account else None
        current_balance = flt(frappe.db.get_value("Hambaft Finance Account", row.finance_account, "current_balance") or 0) if row.finance_account else 0
        linked_finance.append({
            "finance_account": row.finance_account or "",
            "account_name": account_name or "",
            "current_balance": current_balance,
            "finance_type": row.finance_type,
            "initial_amount": row.initial_amount or 0,
            "target_amount": row.target_amount or 0,
            "weight": row.weight or 100,
            "notes": row.notes or "",
        })

    # Get linked projects — rich detail from Goal Project Link + project data
    linked_projects = _get_goal_linked_projects(doc)

    # Parse health_detail if available
    health_detail_parsed = None
    if getattr(doc, "health_detail", None):
        try:
            health_detail_parsed = json.loads(doc.health_detail)
        except Exception:
            health_detail_parsed = None

    # Parse last_snapshot if available
    last_snapshot_parsed = None
    if getattr(doc, "last_snapshot_json", None):
        try:
            last_snapshot_parsed = json.loads(doc.last_snapshot_json)
        except Exception:
            last_snapshot_parsed = None

    return {
        "name": doc.name,
        "title": doc.title,
        "description": doc.description or "",
        "area": doc.area,
        "category": doc.category,
        "goal_type": doc.goal_type,
        "progress_mode": doc.progress_mode,
        "status": doc.status,
        "parent_goal": doc.parent_goal,
        "goal_level": doc.goal_level,
        "target_value": doc.target_value or 0,
        "current_value": doc.current_value or 0,
        "unit": doc.unit or "",
        "start_date": doc.start_date,
        "target_date": doc.target_date,
        "progress_percent": doc.progress_percent or 0,
        "derived_progress_detail": doc.derived_progress_detail or "",
        "priority": doc.priority,
        "notes": doc.notes or "",
        "tags": doc.tags or "",
        "color": doc.color,
        "icon": doc.icon,
        "user": doc.user,
        # Project weight buckets
        "project_progress_weight": doc.project_progress_weight or 40,
        "milestone_weight": doc.milestone_weight or 25,
        "key_task_weight": doc.key_task_weight or 20,
        "tracked_time_weight": doc.tracked_time_weight or 10,
        "metric_weight": doc.metric_weight or 5,
        # Health
        "health_state": getattr(doc, "health_state", None) or None,
        "health_detail": health_detail_parsed,
        # Completion policy
        "completion_policy": getattr(doc, "completion_policy", None) or "آستانه_پیشرفت",
        "completion_threshold": getattr(doc, "completion_threshold", None) or 100,
        # Snapshot
        "last_snapshot": last_snapshot_parsed,
        "last_snapshot_at": str(doc.last_snapshot_at) if getattr(doc, "last_snapshot_at", None) else None,
        # Child tables
        "linked_habits": linked_habits,
        "linked_finance_accounts": linked_finance,
        "linked_projects": linked_projects,
        "noteBlocks": _extract_note_blocks(doc),
        "creation": str(doc.creation) if getattr(doc, "creation", None) else None,
    }


def _get_goal_linked_projects(doc):
    """Get rich linked project data for a goal."""
    result = []
    seen = set()

    # From Goal Project Link child table
    for row in doc.get("linked_projects") or []:
        if not row.project:
            continue
        seen.add(row.project)
        proj_data = _load_project_for_goal(row.project)
        result.append({
            "project": row.project,
            "title": proj_data.get("title", ""),
            "status": proj_data.get("status", ""),
            "progress": proj_data.get("progress", 0),
            "effort_type": proj_data.get("effort_type", ""),
            "estimated_hours": proj_data.get("estimated_hours", 0),
            "actual_minutes": proj_data.get("actual_minutes", 0),
            "total_tasks": proj_data.get("total_tasks", 0),
            "done_tasks": proj_data.get("done_tasks", 0),
            "milestone_total": proj_data.get("milestone_total", 0),
            "milestone_done": proj_data.get("milestone_done", 0),
            "key_total": proj_data.get("key_total", 0),
            "key_done": proj_data.get("key_done", 0),
            # Link metadata
            "weight": row.weight or 100,
            "contribution_type": row.contribution_type or "اجباری",
            "is_mandatory": cint(row.is_mandatory),
            "sort_order": cint(row.sort_order or 0),
            "notes": row.notes or "",
        })

    # Fallback: projects with goal field pointing to this goal
    fallback = frappe.get_all(
        "Hambaft Project",
        filters={"goal": doc.name, "user": doc.user},
        fields=["name"],
    )
    for p in fallback:
        if p.name not in seen:
            proj_data = _load_project_for_goal(p.name)
            result.append({
                "project": p.name,
                "title": proj_data.get("title", ""),
                "status": proj_data.get("status", ""),
                "progress": proj_data.get("progress", 0),
                "effort_type": proj_data.get("effort_type", ""),
                "estimated_hours": proj_data.get("estimated_hours", 0),
                "actual_minutes": proj_data.get("actual_minutes", 0),
                "total_tasks": proj_data.get("total_tasks", 0),
                "done_tasks": proj_data.get("done_tasks", 0),
                "milestone_total": proj_data.get("milestone_total", 0),
                "milestone_done": proj_data.get("milestone_done", 0),
                "key_total": proj_data.get("key_total", 0),
                "key_done": proj_data.get("key_done", 0),
                "weight": 100,
                "contribution_type": "اجباری",
                "is_mandatory": 1,
                "sort_order": 0,
                "notes": "",
            })

    result.sort(key=lambda x: x.get("sort_order", 0))
    return result


def _load_project_for_goal(project_name):
    """Load a project's current state for goal serialization."""
    try:
        p = frappe.get_all(
            "Hambaft Project",
            filters={"name": project_name},
            fields=["name", "title", "status", "progress", "effort_type",
                     "estimated_hours", "actual_minutes"],
            limit=1,
        )
        if not p:
            return {}
        p = p[0]
        tasks = frappe.get_all(
            "Task",
            filters={"project": project_name},
            fields=["name", "status", "importance"],
        )
        total = len(tasks)
        done_statuses = {"done", "completed", "انجام‌شده", "انجام شده"}
        done = sum(1 for t in tasks if t.status in done_statuses)
        milestones = [t for t in tasks if (t.importance or "عادی") == "نقطه‌عطف"]
        key_tasks = [t for t in tasks if (t.importance or "عادی") == "کلیدی"]

        return {
            "title": p.title,
            "status": p.status,
            "progress": flt(p.progress or 0),
            "effort_type": p.effort_type,
            "estimated_hours": flt(p.estimated_hours or 0),
            "actual_minutes": cint(p.actual_minutes or 0),
            "total_tasks": total,
            "done_tasks": done,
            "milestone_total": len(milestones),
            "milestone_done": sum(1 for t in milestones if t.status in done_statuses),
            "key_total": len(key_tasks),
            "key_done": sum(1 for t in key_tasks if t.status in done_statuses),
        }
    except Exception:
        return {}


@frappe.whitelist()
def compute_goal_progress(name):
    """Recompute and save goal progress, health, and snapshot. Returns the updated progress."""
    _check_auth()
    _require_owner("Goal", name)
    doc = frappe.get_doc("Goal", name)
    pct, detail = doc.compute_progress()
    doc.progress_percent = pct
    doc.derived_progress_detail = json.dumps(detail, ensure_ascii=False)

    # Compute health
    health_state, health_detail = doc.compute_health(pct, detail)
    doc.health_state = health_state
    doc.health_detail = json.dumps(health_detail, ensure_ascii=False)

    # Check completion policy
    if doc.check_completion(pct, detail):
        doc.status = "تکمیل‌شده"
    elif pct >= 100:
        doc.status = "تکمیل‌شده"

    doc.save(ignore_permissions=True)

    # Save snapshot
    doc.save_snapshot(pct, detail, health_state, health_detail, trigger="api_call")

    frappe.db.commit()
    return _api_response({
        "progress_percent": pct,
        "detail": detail,
        "health_state": health_state,
        "health_detail": health_detail,
        "goal": _goal_to_frontend(doc),
    })


@frappe.whitelist()
def get_goal_detail(name):
    """Get full goal detail with habit links, finance links, projects."""
    _check_auth()
    _require_owner("Goal", name)
    doc = frappe.get_doc("Goal", name)
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def link_goal_habit(goal_name, habit, contribution_type="تعداد_انجام", weight=100,
                    period="ماهانه", target_value=None, cap_value=None, is_negative=0, notes=None):
    """Add a habit link to a goal."""
    _check_auth()
    _require_owner("Goal", goal_name)
    doc = frappe.get_doc("Goal", goal_name)
    # Check for duplicate
    for row in doc.get("linked_habits") or []:
        if row.habit == habit:
            return _api_response({"ok": False, "message": "habit_already_linked"})
    doc.append("linked_habits", {
        "habit": habit,
        "contribution_type": contribution_type,
        "weight": flt(weight or 100),
        "period": period,
        "target_value": flt(target_value) if target_value else None,
        "cap_value": flt(cap_value) if cap_value else None,
        "is_negative": cint(is_negative),
        "notes": notes or "",
    })
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def unlink_goal_habit(goal_name, habit):
    """Remove a habit link from a goal."""
    _check_auth()
    _require_owner("Goal", goal_name)
    doc = frappe.get_doc("Goal", goal_name)
    doc.set("linked_habits", [row for row in doc.get("linked_habits") or [] if row.habit != habit])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def link_goal_finance(goal_name, finance_account, finance_type="موجودی_حساب",
                      initial_amount=None, target_amount=None, weight=100, notes=None):
    """Add a finance account link to a goal."""
    _check_auth()
    _require_owner("Goal", goal_name)
    doc = frappe.get_doc("Goal", goal_name)
    # Check for duplicate
    for row in doc.get("linked_finance_accounts") or []:
        if row.finance_account == finance_account:
            return _api_response({"ok": False, "message": "account_already_linked"})
    doc.append("linked_finance_accounts", {
        "finance_account": finance_account,
        "finance_type": finance_type,
        "initial_amount": flt(initial_amount) if initial_amount else None,
        "target_amount": flt(target_amount) if target_amount else None,
        "weight": flt(weight or 100),
        "notes": notes or "",
    })
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def unlink_goal_finance(goal_name, finance_account):
    """Remove a finance account link from a goal."""
    _check_auth()
    _require_owner("Goal", goal_name)
    doc = frappe.get_doc("Goal", goal_name)
    doc.set("linked_finance_accounts", [row for row in doc.get("linked_finance_accounts") or [] if row.finance_account != finance_account])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def link_goal_project(goal_name, project_name, contribution_type="اجباری", weight=100, is_mandatory=1, sort_order=0, notes=None):
    """Link a project to a goal with rich metadata. Also sets project.goal as back-link."""
    _check_auth()
    _require_owner("Goal", goal_name)
    _require_owner("Hambaft Project", project_name)

    doc = frappe.get_doc("Goal", goal_name)

    # Check for duplicate
    for row in doc.get("linked_projects") or []:
        if row.project == project_name:
            return _api_response({"ok": False, "message": "project_already_linked"})

    doc.append("linked_projects", {
        "project": project_name,
        "contribution_type": contribution_type,
        "weight": flt(weight or 100),
        "is_mandatory": cint(is_mandatory),
        "sort_order": cint(sort_order or 0),
        "notes": notes or "",
    })
    doc.save(ignore_permissions=True)

    # Also set back-link on project
    frappe.db.set_value("Hambaft Project", project_name, "goal", goal_name, update_modified=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def unlink_goal_project(goal_name, project_name):
    """Unlink a project from a goal (removes from child table + clears project.goal)."""
    _check_auth()
    _require_owner("Goal", goal_name)

    doc = frappe.get_doc("Goal", goal_name)
    doc.set("linked_projects", [row for row in doc.get("linked_projects") or [] if row.project != project_name])
    doc.save(ignore_permissions=True)

    # Clear back-link if it still points to this goal
    proj_goal = frappe.db.get_value("Hambaft Project", project_name, "goal")
    if proj_goal == goal_name:
        frappe.db.set_value("Hambaft Project", project_name, "goal", None, update_modified=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def get_goals_with_details(limit=100, offset=0):
    """Get all goals for the current user with full detail."""
    _check_auth()
    rows = frappe.get_all(
        "Goal",
        filters=_owner_filter(),
        fields=["name"],
        limit_page_length=cint(limit),
        start=cint(offset),
        order_by="target_date asc, creation desc",
    )
    goals = [_goal_to_frontend(frappe.get_doc("Goal", row.name)) for row in rows]
    return _api_response({"goals": goals})


@frappe.whitelist()
def recompute_all_goal_progress():
    """Recompute progress for all active goals of the current user."""
    _check_auth()
    rows = frappe.get_all(
        "Goal",
        filters={"user": frappe.session.user, "status": ["in", ["فعال", "active", "پیش‌نویس"]]},
        fields=["name"],
    )
    results = []
    for row in rows:
        try:
            doc = frappe.get_doc("Goal", row.name)
            pct, detail = doc.compute_progress()
            doc.progress_percent = pct
            doc.derived_progress_detail = json.dumps(detail, ensure_ascii=False)
            if pct >= 100:
                doc.status = "تکمیل‌شده"
            doc.save(ignore_permissions=True)
            results.append({"name": row.name, "progress_percent": pct})
        except Exception as e:
            results.append({"name": row.name, "error": str(e)})
    frappe.db.commit()
    return _api_response({"recomputed": len(results), "results": results})


@frappe.whitelist()
def get_area_detail(name):
    """Get area with full detail: goals, projects, tasks, tracked time."""
    _check_auth()
    _require_owner("Hambaft Area", name)
    doc = frappe.get_doc("Hambaft Area", name)
    summary = doc.get_summary()
    # Also get goals
    goals = frappe.get_all(
        "Goal",
        filters={"area": name, "user": frappe.session.user},
        fields=["name", "title", "status", "progress_percent", "goal_type", "target_date", "priority"],
        order_by="target_date asc",
    )
    summary["goals"] = goals
    return _api_response(summary)


# ─── Goal Progress Snapshots ──────────────────────────────

@frappe.whitelist()
def get_goal_snapshots(goal_name, limit=30):
    """Get recent snapshots for a goal."""
    _check_auth()
    _require_owner("Goal", goal_name)
    rows = frappe.get_all(
        "Goal Progress Snapshot",
        filters={"goal": goal_name, "user": frappe.session.user},
        fields=["name", "progress_percent", "health_state", "snapshot_date", "trigger_type"],
        limit_page_length=cint(limit),
        order_by="snapshot_date desc",
    )
    return _api_response({"snapshots": rows})


@frappe.whitelist()
def get_goal_trend(goal_name, days=30):
    """Get progress trend for a goal over the last N days."""
    _check_auth()
    _require_owner("Goal", goal_name)
    from datetime import timedelta
    start = (getdate() - timedelta(days=cint(days))).isoformat()
    rows = frappe.get_all(
        "Goal Progress Snapshot",
        filters={"goal": goal_name, "user": frappe.session.user, "snapshot_date": [">=", start]},
        fields=["progress_percent", "health_state", "snapshot_date", "trigger_type"],
        order_by="snapshot_date asc",
    )
    return _api_response({"trend": rows, "days": days})


@frappe.whitelist()
def update_goal_project_weights(goal_name, weights):
    """Update project weight configuration for a goal.

    weights = list of {project, weight, is_mandatory, contribution_type, sort_order}
    """
    _check_auth()
    _require_owner("Goal", goal_name)
    if isinstance(weights, str):
        weights = json.loads(weights)

    doc = frappe.get_doc("Goal", goal_name)
    current = {row.project: row for row in doc.get("linked_projects") or []}

    for w in weights:
        proj = w.get("project")
        if not proj or proj not in current:
            continue
        row = current[proj]
        if "weight" in w:
            row.weight = flt(w["weight"])
        if "is_mandatory" in w:
            row.is_mandatory = cint(w["is_mandatory"])
        if "contribution_type" in w:
            row.contribution_type = w["contribution_type"]
        if "sort_order" in w:
            row.sort_order = cint(w["sort_order"])
        if "notes" in w:
            row.notes = w["notes"]

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def update_goal_signal_weights(goal_name, project_progress_weight=None, milestone_weight=None,
                                key_task_weight=None, tracked_time_weight=None, metric_weight=None):
    """Update the 5 signal weights for project-driven goal progress."""
    _check_auth()
    _require_owner("Goal", goal_name)
    doc = frappe.get_doc("Goal", goal_name)
    if project_progress_weight is not None:
        doc.project_progress_weight = flt(project_progress_weight)
    if milestone_weight is not None:
        doc.milestone_weight = flt(milestone_weight)
    if key_task_weight is not None:
        doc.key_task_weight = flt(key_task_weight)
    if tracked_time_weight is not None:
        doc.tracked_time_weight = flt(tracked_time_weight)
    if metric_weight is not None:
        doc.metric_weight = flt(metric_weight)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


@frappe.whitelist()
def update_goal_completion_policy(goal_name, completion_policy=None, completion_threshold=None):
    """Update completion policy for a goal."""
    _check_auth()
    _require_owner("Goal", goal_name)
    doc = frappe.get_doc("Goal", goal_name)
    if completion_policy:
        doc.completion_policy = completion_policy
    if completion_threshold is not None:
        doc.completion_threshold = flt(completion_threshold)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"goal": _goal_to_frontend(doc)})


# ─── Saved Planner View APIs ──────────────────────────────────

@frappe.whitelist()
def get_overdue_tasks(limit=100):
    """Tasks with due_date in the past that are not done."""
    _check_auth()
    _done = ["done", "completed", "انجام‌شده", "انجام شده", "dropped"]
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "status": ["not in", _done],
            "due_date": ["<", today()],
        },
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_key_tasks(limit=100):
    """All key-importance tasks not done."""
    _check_auth()
    _done = ["done", "completed", "انجام‌شده", "انجام شده", "dropped"]
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "status": ["not in", _done],
            "importance": "کلیدی",
        },
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_milestone_tasks(limit=100):
    """All milestone-importance tasks not done."""
    _check_auth()
    _done = ["done", "completed", "انجام‌شده", "انجام شده", "dropped"]
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "status": ["not in", _done],
            "importance": "نقطه‌عطف",
        },
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_unscheduled_tasks(limit=100):
    """Open tasks with no scheduled_date and no due_date."""
    _check_auth()
    _done = ["done", "completed", "انجام‌شده", "انجام شده", "dropped"]
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "status": ["not in", _done],
            "scheduled_date": ["is", "not set"],
            "due_date": ["is", "not set"],
        },
        fields="*",
        limit_page_length=cint(limit),
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_blocked_tasks_view(limit=100):
    """All tasks that have blocked_by dependencies and are not done."""
    _check_auth()
    _done = ["done", "completed", "انجام‌شده", "انجام شده", "dropped"]
    # Get all tasks with blocked_by_json set
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "status": ["not in", _done],
            "blocked_by_json": ["is", "set"],
        },
        fields="*",
        limit_page_length=cint(limit),
    )
    # Filter to only those with actual incomplete blockers
    _done_set = _done
    result = []
    for t in tasks:
        blocked = _loads_json(t.blocked_by_json, [])
        if not blocked:
            continue
        has_incomplete = False
        for dep_id in blocked:
            dep_status = frappe.db.get_value("Task", dep_id, "status")
            if dep_status and dep_status not in _done_set:
                has_incomplete = True
                break
        if has_incomplete:
            result.append(dict(t))
        else:
            # All blockers done — mark as resolvable
            d = dict(t)
            d["_all_blockers_done"] = True
            result.append(d)
    enriched = [_enrich_task_with_impact(t) for t in result]
    enriched.sort(key=_impact_sort_key)
    return _api_response({"tasks": enriched})


@frappe.whitelist()
def get_high_impact_tasks(limit=50):
    """Tasks with highest impact score — for focused execution view."""
    _check_auth()
    _done = ["done", "completed", "انجام‌شده", "انجام شده", "dropped"]
    tasks = frappe.get_all(
        "Task",
        filters={
            "user": frappe.session.user,
            "status": ["not in", _done],
        },
        fields="*",
        limit_page_length=cint(limit) * 3,  # fetch more, filter by score
    )
    enriched = [_enrich_task_with_impact(dict(t)) for t in tasks]
    enriched.sort(key=_impact_sort_key)
    # Return top N by impact
    return _api_response({"tasks": enriched[:cint(limit)]})


@frappe.whitelist()
def get_area_board(area_name):
    """Get area detail with all projects, tasks, and derived stats."""
    _check_auth()
    _require_owner("Hambaft Area", area_name)
    doc = frappe.get_doc("Hambaft Area", area_name)
    return _api_response(doc.get_summary())


@frappe.whitelist()
def get_project_detail_with_tasks(project_name):
    """Get project with full task detail, subprojects, and derived stats."""
    _check_auth()
    _require_owner("Hambaft Project", project_name)
    doc = frappe.get_doc("Hambaft Project", project_name)
    _done_set = {"done", "completed", "انجام‌شده", "انجام شده"}
    
    # Tasks with importance stats
    tasks = frappe.get_all(
        "Task",
        filters={"project": project_name, "user": frappe.session.user},
        fields="*",
        order_by="importance asc, priority asc, scheduled_date asc",
    )
    
    total = len(tasks)
    done = sum(1 for t in tasks if t.status in _done_set)
    milestones = [t for t in tasks if (t.importance or "عادی") == "نقطه‌عطف"]
    key_tasks_list = [t for t in tasks if (t.importance or "عادی") == "کلیدی"]
    
    # Subprojects
    subprojects = doc.get_subprojects()
    blocked_by = doc.get_blocked_by_projects()
    is_blocked, blocked_reason = doc.is_blocked()
    
    # Tracked minutes
    tracked = doc.actual_minutes or 0
    
    # Quality-aware progress
    quality_progress = doc.compute_progress()
    
    return _api_response({
        "project": _project_to_frontend(doc),
        "tasks": tasks,
        "subprojects": subprojects,
        "blocked_by": blocked_by,
        "is_blocked": is_blocked,
        "blocked_reason": blocked_reason,
        "stats": {
            "total_tasks": total,
            "done_tasks": done,
            "milestone_total": len(milestones),
            "milestone_done": sum(1 for t in milestones if t.status in _done_set),
            "key_total": len(key_tasks_list),
            "key_done": sum(1 for t in key_tasks_list if t.status in _done_set),
            "tracked_minutes": tracked,
            "quality_progress": quality_progress,
            "raw_progress": doc.progress or 0,
        },
    })


# ─── Quick Add Task with Context-Aware Defaults ──────────────

@frappe.whitelist()
def quick_add_task(title, project=None, area=None, goal=None, importance=None, context=None, status=None, priority=None, scheduled_date=None, due_date=None):
    """Create a task quickly with context-aware defaults.
    
    Context logic:
    - If project is given: auto-set area from project, auto-set goal from project's linked goal
    - If area is given but no project: set default status based on area's active projects
    - If importance is not given: infer from project contribution type (mandatory → key)
    - context: optional string like 'planner_today', 'planner_inbox', 'area_board', 'project_detail'
    - Explicit status/priority/scheduled_date/due_date override context defaults
    """
    _check_auth()
    user = frappe.session.user
    
    defaults = {
        "title": title,
        "user": user,
        "status": "inbox",
        "priority": "متوسط",
    }
    
    # Context-based defaults
    if context == "planner_today":
        defaults["status"] = "today"
        defaults["is_daily_highlight"] = 1
    elif context == "planner_next":
        defaults["status"] = "next"
    elif context == "planner_scheduled":
        defaults["status"] = "not_started"
    
    # Project context: inherit area and goal
    if project:
        defaults["project"] = project
        proj_doc = frappe.get_doc("Hambaft Project", project)
        if not area and proj_doc.area:
            defaults["area"] = proj_doc.area
        if not goal and proj_doc.goal:
            defaults["goal"] = proj_doc.goal
        # Infer importance from project's contribution type to its goal
        if not importance:
            links = frappe.get_all(
                "Goal Project Link",
                filters={"project": project, "parenttype": "Goal"},
                fields=["contribution_type"],
                limit=1,
            )
            if links and links[0].contribution_type == "اجباری":
                importance = "کلیدی"
    
    if area:
        defaults["area"] = area
    if goal:
        defaults["goal"] = goal
    if importance:
        defaults["importance"] = importance
    
    # Explicit overrides take precedence
    if status:
        defaults["status"] = status
    if priority:
        defaults["priority"] = priority
    if scheduled_date:
        defaults["scheduled_date"] = scheduled_date
    if due_date:
        defaults["due_date"] = due_date
    
    # Set scheduled_date for today context
    if context and "today" in context:
        defaults["scheduled_date"] = frappe.utils.today()
    
    data = _inject_note_blocks(defaults)
    doc = frappe.new_doc("Task")
    doc.update(data)
    doc.user = user
    doc.insert()
    frappe.db.commit()
    
    result = doc.as_dict()
    result["noteBlocks"] = _extract_note_blocks(doc)
    enriched = _enrich_task_with_impact(dict(result))
    return _api_response({"task": enriched})


# ─── One-time Migration Helpers ───────────────────────────────────

@frappe.whitelist()
def run_task_status_migration():
    """Migrate old Persian task statuses to English equivalents.
    
    Run via: bench --site <site> execute hambaft.hambaft.api.run_task_status_migration
    Or call as API from browser console (admin only).
    """
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)

    _STATUS_MAP = {
        "انجام‌شده": "done",
        "انجام شده": "done",
        "در حال انجام": "in_progress",
        "در_حال_انجام": "in_progress",
        "انجام‌نشده": "inbox",
        "انجام نشده": "inbox",
        "لغو‌شده": "dropped",
        "لغو شده": "dropped",
    }

    task_dt = "Task"
    updated = 0
    if not frappe.db.exists("DocType", task_dt):
        return _api_response({"status": "skipped", "reason": "Task DocType not found"})

    for old_status, new_status in _STATUS_MAP.items():
        names = frappe.get_all(task_dt, filters={"status": old_status}, pluck="name")
        for name in names:
            try:
                frappe.db.set_value(task_dt, name, "status", new_status, update_modified=True)
                updated += 1
            except Exception as e:
                frappe.logger().warning(f"migrate_task_status: failed {name}: {e}")

    frappe.db.commit()
    return _api_response({"status": "done", "updated": updated})


@frappe.whitelist()
def run_project_tasks_migration():
    """Migrate child-table tasks (Hambaft Task) into real Task records.
    Safe to run multiple times — idempotent.
    """
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)

    # Status mapping: normalize any legacy/local value to a valid Task.status option
    # Valid Task statuses: inbox, not_started, next, today, in_progress, done, on_hold, someday, dropped,
    #                      صندوق ورودی, انجام‌شده, انجام‌نشده, در حال انجام, متوقف, شاید
    _STATUS_FA_TO_EN_LOCAL = {
        "انجام‌شده": "done", "انجام شده": "done",
        "در حال انجام": "in_progress", "در_حال_انجام": "in_progress",
        "انجام‌نشده": "inbox", "انجام نشده": "inbox",
        "لغو‌شده": "dropped", "لغو شده": "dropped",
        # Project statuses that leaked into child tasks
        "فعال": "in_progress", "برنامه‌ریزی": "inbox",
        "متوقف‌شده": "on_hold", "متوقف شده": "on_hold",
        "تکمیل‌شده": "done", "تکمیل شده": "done",
        # English project statuses
        "active": "in_progress", "planning": "inbox",
        "paused": "on_hold", "completed": "done",
        # Other possible values
        "شروع‌نشده": "not_started", "شروع نشده": "not_started",
        "در انتظار": "on_hold",
        "today": "today", "next": "next",
        "someday": "someday", "on_hold": "on_hold",
        "in_progress": "in_progress", "done": "done",
        "inbox": "inbox", "dropped": "dropped",
        "not_started": "not_started",
        "صندوق ورودی": "inbox", "متوقف": "on_hold", "شاید": "someday",
    }
    _VALID_TASK_STATUSES = {
        "inbox", "not_started", "next", "today", "in_progress",
        "done", "on_hold", "someday", "dropped",
        "صندوق ورودی", "انجام‌شده", "انجام‌نشده", "در حال انجام", "متوقف", "شاید",
    }

    # Priority mapping: normalize any legacy value to a valid Task.priority option
    _PRIORITY_MAP = {
        "زیاد": "بالا",
        "خیلی زیاد": "فوری",
        "کم": "پایین",
        "متوسط": "متوسط",
        "بالا": "بالا",
        "پایین": "پایین",
        "فوری": "فوری",
        "low": "low",
        "medium": "medium",
        "high": "high",
        "urgent": "urgent",
    }
    _VALID_TASK_PRIORITIES = {"low", "medium", "high", "urgent", "پایین", "متوسط", "بالا", "فوری"}

    if not frappe.db.exists("DocType", "Hambaft Task"):
        return _api_response({"status": "skipped", "reason": "Hambaft Task DocType not found"})

    if not frappe.db.exists("DocType", "Task"):
        return _api_response({"status": "skipped", "reason": "Task DocType not found"})

    projects = frappe.get_all(
        "Hambaft Project",
        fields=["name", "user", "area", "goal"],
    )

    created = 0
    skipped = 0
    errors = []

    for proj in projects:
        doc = frappe.get_doc("Hambaft Project", proj.name)
        child_tasks = doc.get("tasks") or []

        if not child_tasks:
            continue

        for row in child_tasks:
            title = getattr(row, "title", None)
            if not title:
                continue

            status = getattr(row, "status", "inbox") or "inbox"
            status = _STATUS_FA_TO_EN_LOCAL.get(status, status)
            # Final safety: if still not valid, default to inbox
            if status not in _VALID_TASK_STATUSES:
                status = "inbox"

            # Check if a matching Task already exists
            existing = frappe.get_all(
                "Task",
                filters={
                    "project": proj.name,
                    "title": title,
                    "user": proj.user or frappe.session.user,
                },
                fields=["name"],
                limit=1,
            )

            if existing:
                skipped += 1
                continue

            # Create a real Task record
            try:
                task_doc = frappe.new_doc("Task")
                task_doc.title = title
                task_doc.description = getattr(row, "description", "") or ""
                task_doc.project = proj.name
                task_doc.status = status
                task_doc.priority = _PRIORITY_MAP.get(
                    getattr(row, "priority", "متوسط") or "متوسط",
                    "متوسط"
                )
                # Final safety: if priority still not valid, default to متوسط
                if task_doc.priority not in _VALID_TASK_PRIORITIES:
                    task_doc.priority = "متوسط"
                task_doc.user = proj.user or frappe.session.user
                task_doc.area = proj.area or None
                task_doc.goal = proj.goal or None
                task_doc.due_date = getattr(row, "due_date", None) or None
                task_doc.importance = "عادی"
                task_doc.insert(ignore_permissions=True)
                created += 1
            except Exception as e:
                errors.append({
                    "project": proj.name,
                    "title": title,
                    "error": str(e),
                })

    frappe.db.commit()
    return _api_response({"status": "done", "created": created, "skipped": skipped, "errors": errors})


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 6: Partner Connection & Social Infrastructure
# ═══════════════════════════════════════════════════════════════════════════════

def _generate_invite_code():
    import random, string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


def _user_display_info(user_email):
    """Get display info for a user by email."""
    full_name = frappe.db.get_value("User", user_email, "full_name") or user_email
    user_image = frappe.db.get_value("User", user_email, "user_image") or None
    # Try to get username
    username = frappe.db.get_value("User", user_email, "username") or None
    return {
        "email": user_email,
        "full_name": full_name,
        "username": username,
        "avatar_url": user_image,
    }


@frappe.whitelist()
def invite_partner(data):
    """Send a partner invite by username, email, or generate an invite code."""
    _check_auth()
    user = frappe.session.user

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    invitee_identifier = (data.get("username") or data.get("email") or "").strip()
    goal_id = data.get("goal_id")
    message = data.get("message") or ""

    if not invitee_identifier and not data.get("generate_code"):
        frappe.throw("Provide a username, email, or request an invite code.")

    # Resolve invitee
    invitee = None
    if invitee_identifier:
        # Try by email first
        if "@" in invitee_identifier:
            invitee = frappe.db.get_value("User", {"email": invitee_identifier}, "name")
        # Try by username
        if not invitee:
            invitee = frappe.db.get_value("User", {"username": invitee_identifier}, "name")
        # Try by full_name (fuzzy)
        if not invitee:
            invitee = frappe.db.get_value("User", {"full_name": ["like", f"%{invitee_identifier}%"]}, "name")

        if not invitee and not data.get("generate_code"):
            frappe.throw(f"User '{invitee_identifier}' not found. You can generate an invite code instead.")

    # Check not inviting self
    if invitee and invitee == user:
        frappe.throw("You cannot invite yourself.")

    # Check for existing pending invite
    if invitee:
        existing = frappe.db.exists(
            "Hambaft Partner Invite",
            {
                "inviter": user,
                "invitee": invitee,
                "status": "در_انتظار",
            },
        )
        if existing:
            frappe.throw("A pending invite already exists for this user.")

        # Check if already connected
        conn = frappe.db.sql(
            """SELECT name FROM `tabHambaft Partner Connection`
            WHERE status = 'فعال'
            AND ((user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s))
            LIMIT 1""",
            (user, invitee, invitee, user),
        )
        if conn:
            frappe.throw("You are already connected with this user.")

    # Validate goal if specified
    if goal_id:
        goal_owner = frappe.db.get_value("Hambaft Goal", goal_id, "user")
        if goal_owner != user:
            frappe.throw("You can only share your own goals.", frappe.PermissionError)

    # Create invite
    invite_code = _generate_invite_code()
    from frappe.utils import now_datetime, add_to_date
    expires_at = add_to_date(now_datetime(), days=7)

    doc = frappe.new_doc("Hambaft Partner Invite")
    doc.inviter = user
    doc.invitee = invitee or ""
    doc.invitee_username = invitee_identifier or ""
    doc.invite_code = invite_code
    doc.status = "در_انتظار"
    doc.goal = goal_id or ""
    doc.message = message
    doc.expires_at = expires_at
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    invite_info = {
        "invite_id": doc.name,
        "invite_code": invite_code,
        "status": doc.status,
        "expires_at": str(expires_at),
    }

    if invitee:
        invite_info["invitee"] = _user_display_info(invitee)

    return _api_response(invite_info)


@frappe.whitelist()
def accept_partner_invite(data=None):
    """Accept a partner invite by invite code or invite ID."""
    _check_auth()
    user = frappe.session.user

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    invite_code = data.get("invite_code")
    invite_id = data.get("invite_id")

    if not invite_code and not invite_id:
        frappe.throw("Provide invite_code or invite_id.")

    # Find the invite
    if invite_code:
        invite_name = frappe.db.get_value("Hambaft Partner Invite", {"invite_code": invite_code, "status": "در_انتظار"})
    else:
        invite_name = frappe.db.get_value("Hambaft Partner Invite", {"name": invite_id, "status": "در_انتظار"})

    if not invite_name:
        frappe.throw("Invite not found or no longer pending.")

    invite_doc = frappe.get_doc("Hambaft Partner Invite", invite_name)

    # Check if invite is for a specific user
    if invite_doc.invitee and invite_doc.invitee != user:
        frappe.throw("This invite was sent to another user.")

    # Check expiry
    from frappe.utils import now_datetime
    if invite_doc.expires_at and now_datetime() > get_datetime(invite_doc.expires_at):
        invite_doc.status = "منقضی‌شده"
        invite_doc.save(ignore_permissions=True)
        frappe.db.commit()
        frappe.throw("This invite has expired.")

    # Check not already connected
    inviter = invite_doc.inviter
    conn = frappe.db.sql(
        """SELECT name FROM `tabHambaft Partner Connection`
        WHERE status = 'فعال'
        AND ((user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s))
        LIMIT 1""",
        (inviter, user, user, inviter),
    )
    if conn:
        frappe.throw("You are already connected with this user.")

    # Create partner connection
    import datetime
    conn_doc = frappe.new_doc("Hambaft Partner Connection")
    conn_doc.user_a = inviter
    conn_doc.user_b = user
    conn_doc.status = "فعال"
    conn_doc.connected_since = datetime.date.today()
    conn_doc.notes = invite_doc.message or ""
    conn_doc.insert(ignore_permissions=True)

    # Update invite
    invite_doc.status = "پذیرفته‌شده"
    invite_doc.responded_at = now_datetime()
    invite_doc.save(ignore_permissions=True)

    # If there's a goal, add the new user as a goal member
    if invite_doc.goal:
        goal = frappe.get_doc("Hambaft Goal", invite_doc.goal)
        # Update goal privacy to shared
        if goal.privacy == "خصوصی":
            goal.privacy = "اشتراکی"
        # Add member
        existing_member = frappe.db.exists("Hambaft Goal Member", {
            "goal": invite_doc.goal,
            "user": user,
            "status": "فعال",
        })
        if not existing_member:
            goal_member = frappe.new_doc("Hambaft Goal Member")
            goal_member.goal = invite_doc.goal
            goal_member.user = user
            goal_member.role = "پارتنر"
            goal_member.status = "فعال"
            goal_member.joined_at = datetime.date.today()
            goal_member.insert(ignore_permissions=True)

        # Also ensure owner is a member
        owner_member = frappe.db.exists("Hambaft Goal Member", {
            "goal": invite_doc.goal,
            "user": inviter,
            "status": "فعال",
        })
        if not owner_member:
            goal_member = frappe.new_doc("Hambaft Goal Member")
            goal_member.goal = invite_doc.goal
            goal_member.user = inviter
            goal_member.role = "مالک"
            goal_member.status = "فعال"
            goal_member.joined_at = datetime.date.today()
            goal_member.insert(ignore_permissions=True)

    frappe.db.commit()

    return _api_response({
        "connection_id": conn_doc.name,
        "partner": _user_display_info(inviter),
        "goal_shared": invite_doc.goal or None,
        "status": "connected",
    })


@frappe.whitelist()
def reject_partner_invite(data=None):
    """Reject a partner invite."""
    _check_auth()
    user = frappe.session.user

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    invite_id = data.get("invite_id")
    invite_code = data.get("invite_code")

    if not invite_id and not invite_code:
        frappe.throw("Provide invite_id or invite_code.")

    if invite_code:
        invite_name = frappe.db.get_value("Hambaft Partner Invite", {"invite_code": invite_code, "status": "در_انتظار"})
    else:
        invite_name = invite_id

    if not invite_name:
        frappe.throw("Invite not found or no longer pending.")

    invite_doc = frappe.get_doc("Hambaft Partner Invite", invite_name)

    if invite_doc.invitee and invite_doc.invitee != user:
        frappe.throw("This invite was not sent to you.")

    from frappe.utils import now_datetime
    invite_doc.status = "ردشده"
    invite_doc.responded_at = now_datetime()
    invite_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _api_response({"status": "rejected"})


@frappe.whitelist()
def cancel_partner_invite(invite_id=None):
    """Cancel a partner invite you sent."""
    _check_auth()
    user = frappe.session.user

    if not invite_id:
        frappe.throw("Provide invite_id.")

    invite_doc = frappe.get_doc("Hambaft Partner Invite", invite_id)

    if invite_doc.inviter != user:
        frappe.throw("You can only cancel your own invites.")

    if invite_doc.status != "در_انتظار":
        frappe.throw("Only pending invites can be cancelled.")

    invite_doc.status = "cancelled"
    invite_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return _api_response({"status": "cancelled"})


@frappe.whitelist()
def get_partner_invites():
    """Get all partner invites for the current user (sent and received)."""
    _check_auth()
    user = frappe.session.user

    # Invites I sent
    sent = frappe.get_all(
        "Hambaft Partner Invite",
        filters={"inviter": user},
        fields=["name", "invitee", "invitee_username", "invite_code", "status", "goal", "message", "expires_at", "creation"],
        order_by="creation desc",
    )
    for inv in sent:
        if inv.invitee:
            inv["invitee_info"] = _user_display_info(inv.invitee)

    # Invites I received
    received = frappe.get_all(
        "Hambaft Partner Invite",
        filters={"invitee": user, "status": "در_انتظار"},
        fields=["name", "inviter", "invite_code", "status", "goal", "message", "expires_at", "creation"],
        order_by="creation desc",
    )
    for inv in received:
        inv["inviter_info"] = _user_display_info(inv.inviter)

    return _api_response({"sent": sent, "received": received})


@frappe.whitelist()
def get_partners():
    """Get all active partner connections for the current user."""
    _check_auth()
    user = frappe.session.user

    connections = frappe.db.sql(
        """SELECT name, user_a, user_b, connected_since, notes
        FROM `tabHambaft Partner Connection`
        WHERE status = 'فعال' AND (user_a = %s OR user_b = %s)
        ORDER BY connected_since DESC""",
        (user, user),
        as_dict=True,
    )

    partners = []
    for conn in connections:
        partner_email = conn.user_b if conn.user_a == user else conn.user_a
        info = _user_display_info(partner_email)

        # Count shared goals
        shared_goals = frappe.db.sql(
            """SELECT COUNT(DISTINCT gm.goal) as cnt
            FROM `tabHambaft Goal Member` gm
            WHERE gm.user = %s AND gm.status = 'فعال'
            AND gm.goal IN (
                SELECT gm2.goal FROM `tabHambaft Goal Member` gm2
                WHERE gm2.user = %s AND gm2.status = 'فعال'
            )""",
            (user, partner_email),
            as_dict=True,
        )
        shared_count = shared_goals[0].cnt if shared_goals else 0

        partners.append({
            "connection_id": conn.name,
            "partner": info,
            "connected_since": str(conn.connected_since) if conn.connected_since else None,
            "notes": conn.notes or "",
            "shared_goals_count": shared_count,
        })

    return _api_response({"partners": partners})


@frappe.whitelist()
def remove_partner(connection_id=None):
    """Remove a partner connection."""
    _check_auth()
    user = frappe.session.user

    if not connection_id:
        frappe.throw("Provide connection_id.")

    conn_doc = frappe.get_doc("Hambaft Partner Connection", connection_id)

    if conn_doc.user_a != user and conn_doc.user_b != user:
        frappe.throw("You can only remove your own connections.")

    conn_doc.status = "حذف‌شده"
    conn_doc.save(ignore_permissions=True)

    # Optionally remove goal memberships for this pair
    partner_email = conn_doc.user_b if conn_doc.user_a == user else conn_doc.user_a

    # Remove active goal memberships between these two users
    my_goals = frappe.get_all("Hambaft Goal Member", filters={"user": user, "status": "فعال"}, fields=["goal"])
    for mg in my_goals:
        partner_membership = frappe.db.exists("Hambaft Goal Member", {
            "goal": mg.goal,
            "user": partner_email,
            "status": "فعال",
        })
        if partner_membership:
            frappe.db.set_value("Hambaft Goal Member", partner_membership, "status", "حذف‌شده")

    frappe.db.commit()

    return _api_response({"status": "removed"})


@frappe.whitelist()
def share_goal_with_partner(data=None):
    """Share an existing goal with a partner connection."""
    _check_auth()
    user = frappe.session.user

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    goal_id = data.get("goal_id")
    partner_email = data.get("partner_email") or data.get("partner_id")

    if not goal_id or not partner_email:
        frappe.throw("goal_id and partner_email are required.")

    # Verify goal ownership
    goal_owner = frappe.db.get_value("Hambaft Goal", goal_id, "user")
    if goal_owner != user:
        frappe.throw("Only the goal owner can share it.", frappe.PermissionError)

    # Verify active partner connection
    conn = frappe.db.sql(
        """SELECT name FROM `tabHambaft Partner Connection`
        WHERE status = 'فعال'
        AND ((user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s))
        LIMIT 1""",
        (user, partner_email, partner_email, user),
    )
    if not conn:
        frappe.throw("No active partner connection found with this user.")

    # Check not already shared
    existing = frappe.db.exists("Hambaft Goal Member", {
        "goal": goal_id,
        "user": partner_email,
        "status": "فعال",
    })
    if existing:
        frappe.throw("This goal is already shared with this partner.")

    # Add partner as goal member
    import datetime
    gm = frappe.new_doc("Hambaft Goal Member")
    gm.goal = goal_id
    gm.user = partner_email
    gm.role = "پارتنر"
    gm.status = "فعال"
    gm.joined_at = datetime.date.today()
    gm.insert(ignore_permissions=True)

    # Ensure owner is also a member
    owner_member = frappe.db.exists("Hambaft Goal Member", {
        "goal": goal_id,
        "user": user,
        "status": "فعال",
    })
    if not owner_member:
        gm_owner = frappe.new_doc("Hambaft Goal Member")
        gm_owner.goal = goal_id
        gm_owner.user = user
        gm_owner.role = "مالک"
        gm_owner.status = "فعال"
        gm_owner.joined_at = datetime.date.today()
        gm_owner.insert(ignore_permissions=True)

    # Update goal privacy to shared
    frappe.db.set_value("Hambaft Goal", goal_id, "privacy", "اشتراکی")

    frappe.db.commit()

    return _api_response({
        "status": "shared",
        "goal_id": goal_id,
        "partner": _user_display_info(partner_email),
    })


@frappe.whitelist()
def get_goal_members(goal_id=None):
    """Get all active members of a goal."""
    _check_auth()
    user = frappe.session.user

    if not goal_id:
        frappe.throw("goal_id is required.")

    # Check access: owner or member
    goal = frappe.get_doc("Hambaft Goal", goal_id)
    is_owner = goal.user == user
    is_member = frappe.db.exists("Hambaft Goal Member", {"goal": goal_id, "user": user, "status": "فعال"})

    if not is_owner and not is_member:
        frappe.throw("You do not have access to this goal.", frappe.PermissionError)

    members = frappe.get_all(
        "Hambaft Goal Member",
        filters={"goal": goal_id, "status": "فعال"},
        fields=["name", "user", "role", "joined_at"],
    )

    result = []
    for m in members:
        info = _user_display_info(m.user)
        result.append({
            "membership_id": m.name,
            "user": info,
            "role": m.role,
            "joined_at": str(m.joined_at) if m.joined_at else None,
        })

    # Also include owner if not already in members
    owner_in_members = any(m["user"]["email"] == goal.user for m in result)
    if not owner_in_members:
        result.insert(0, {
            "membership_id": None,
            "user": _user_display_info(goal.user),
            "role": "مالک",
            "joined_at": str(goal.start_date) if goal.start_date else None,
        })

    return _api_response({"members": result})


@frappe.whitelist()
def get_shared_goals():
    """Get all goals shared with the current user (where user is a member but not owner)."""
    _check_auth()
    user = frappe.session.user

    memberships = frappe.get_all(
        "Hambaft Goal Member",
        filters={"user": user, "status": "فعال"},
        fields=["goal", "role"],
    )

    shared_goals = []
    for m in memberships:
        goal_doc = frappe.get_doc("Hambaft Goal", m.goal)
        if goal_doc.user != user or m.role != "مالک":
            goal_data = _goal_to_frontend(goal_doc)
            goal_data["my_role"] = m.role
            goal_data["owner"] = _user_display_info(goal_doc.user)
            shared_goals.append(goal_data)

    return _api_response({"shared_goals": shared_goals})


@frappe.whitelist()
def remove_goal_member(data=None):
    """Remove a member from a shared goal. Only owner can do this."""
    _check_auth()
    user = frappe.session.user

    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}

    goal_id = data.get("goal_id")
    member_email = data.get("member_email")

    if not goal_id or not member_email:
        frappe.throw("goal_id and member_email are required.")

    # Verify ownership
    goal_owner = frappe.db.get_value("Hambaft Goal", goal_id, "user")
    if goal_owner != user:
        frappe.throw("Only the goal owner can remove members.", frappe.PermissionError)

    # Find and deactivate membership
    membership = frappe.db.get_value("Hambaft Goal Member", {
        "goal": goal_id,
        "user": member_email,
        "status": "فعال",
    })

    if not membership:
        frappe.throw("Active membership not found.")

    frappe.db.set_value("Hambaft Goal Member", membership, "status", "حذف‌شده")
    frappe.db.commit()

    return _api_response({"status": "removed"})
