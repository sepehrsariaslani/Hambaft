from __future__ import annotations

import json
import random
from datetime import datetime, date, timedelta

import frappe
from frappe import _
from frappe.utils import now_datetime, getdate, today, cint, flt
from .settings_contract import SETTINGS_FIELDS, get_supported_settings_fields, normalize_settings_update
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


def _unwrap_response(value):
    if isinstance(value, dict) and "data" in value and set(value.keys()) <= {"status", "data", "message"}:
        return value["data"]
    return value


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

    settings = frappe.db.get_value(
        "Profile Settings",
        {"user": frappe.session.user},
        ["onboarding_completed", "onboarding_step"],
        as_dict=True,
    )
    return settings


def _owner_filter():
    return {"user": frappe.session.user}


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
        doc.update(updates)
        return _save_doc(doc)

    allowed_updates = {fieldname: value for fieldname, value in updates.items() if hasattr(doc, fieldname)}
    if not allowed_updates:
        return doc

    frappe.db.set_value("Profile Settings", doc.name, allowed_updates, update_modified=True)
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
        "goal_habits_json": None,
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


def _project_to_frontend(doc):
    task_rows = []
    for row in doc.get("tasks") or []:
        task_rows.append({
            "id": row.name,
            "title": row.title,
            "completed": bool(row.completed or row.status == "انجام‌شده"),
            "createdAt": str(getattr(row, "creation", None) or doc.creation or today())[:10],
            "description": row.description or "",
            "dueDate": str(row.due_date)[:10] if getattr(row, "due_date", None) else None,
            "priority": row.priority,
            "status": row.status,
        })

    return {
        "name": doc.name,
        "title": doc.title,
        "description": doc.description or "",
        "notes": doc.notes or "",
        "goal": doc.goal,
        "status": doc.status,
        "priority": doc.priority,
        "start_date": doc.start_date,
        "target_date": doc.target_date,
        "progress": doc.progress or 0,
        "color": doc.color,
        "icon": doc.icon,
        "tasks": task_rows,
        "creation": str(doc.creation) if getattr(doc, "creation", None) else None,
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
    return {"user": frappe.session.user}


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
        "data": {
            "user": {
                "name": user.name,
                "email": user.email,
                "display_name": user.full_name or user.first_name or user.name,
            },
            "onboarding_completed": bool(settings.get("onboarding_completed")) if settings else False,
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
        "data": {
            "user": {
                "name": user.name,
                "email": user.email,
                "display_name": user.full_name or user.first_name,
            },
            "onboarding_completed": False,
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
    doc = frappe.new_doc("Goal")
    doc.update(data)
    doc.insert()
    frappe.db.commit()
    return _api_response({"goal": doc.as_dict()})


@frappe.whitelist()
def update_goal(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Goal", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"goal": doc.as_dict()})


@frappe.whitelist()
def delete_goal(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Goal", name)
    frappe.db.commit()
    return _api_response({"ok": True})


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
def create_task(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.new_doc("Task")
    doc.update(data)
    doc.insert()
    frappe.db.commit()
    return _api_response({"task": doc.as_dict()})


@frappe.whitelist()
def update_task(name, data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_doc("Task", name)
    doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"task": doc.as_dict()})


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
    frappe.db.commit()
    return _api_response({"task": doc.as_dict()})


@frappe.whitelist()
def delete_task(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    frappe.delete_doc("Task", name)
    frappe.db.commit()
    return _api_response({"ok": True})


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
def log_habit(habit, date=None, status="done", value=1, note=None, mood=None):
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
    if type:
        filters["type"] = type
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
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='income'",
        frappe.session.user)[0][0] or 0)
    total_expense = flt(frappe.db.sql(
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='expense'",
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
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='income' AND date>=%s AND date<%s",
        (frappe.session.user, from_date, to_date))[0][0] or 0)
    expense = flt(frappe.db.sql(
        "SELECT SUM(amount) FROM `tabFinance Entry` WHERE user=%s AND type='expense' AND date>=%s AND date<%s",
        (frappe.session.user, from_date, to_date))[0][0] or 0)
    by_category = frappe.db.sql(
        "SELECT category, SUM(amount) as total FROM `tabFinance Entry` WHERE user=%s AND type='expense' AND date>=%s AND date<%s GROUP BY category ORDER BY total DESC",
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
    doc.insert()
    frappe.db.commit()
    return _api_response({"motivation": doc.as_dict()})


@frappe.whitelist()
def toggle_favorite(name):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
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
def update_settings(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    data = _normalize_settings_update(data)
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
    data = _normalize_settings_update(data)
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
    doc = frappe.new_doc("Hambaft Project")
    doc.user = frappe.session.user
    doc.title = data.get("title")
    doc.description = data.get("description")
    doc.notes = data.get("notes")
    doc.goal = data.get("goal")
    doc.status = data.get("status") or "برنامه‌ریزی"
    doc.priority = data.get("priority") or "متوسط"
    doc.start_date = data.get("start_date")
    doc.target_date = data.get("target_date")
    doc.progress = flt(data.get("progress") or 0)
    doc.color = data.get("color")
    doc.icon = data.get("icon")
    for task in data.get("tasks") or []:
        doc.append("tasks", {
            "title": task.get("title"),
            "description": task.get("description"),
            "status": task.get("status") or ("انجام‌شده" if task.get("completed") else "انجام‌نشده"),
            "priority": task.get("priority") or "متوسط",
            "due_date": task.get("dueDate") or task.get("due_date"),
            "user": frappe.session.user,
            "completed": 1 if task.get("completed") else 0,
        })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"project": _project_to_frontend(doc)})


@frappe.whitelist()
def update_project(name, data):
    _check_auth()
    if isinstance(data, str):
        data = json.loads(data)
    data = data or {}
    doc = frappe.get_doc("Hambaft Project", name)
    doc.title = data.get("title", doc.title)
    doc.description = data.get("description", doc.description)
    doc.notes = data.get("notes", doc.notes)
    doc.goal = data.get("goal", doc.goal)
    doc.status = data.get("status", doc.status)
    doc.priority = data.get("priority", doc.priority)
    doc.start_date = data.get("start_date", doc.start_date)
    doc.target_date = data.get("target_date", doc.target_date)
    doc.progress = flt(data.get("progress", doc.progress or 0))
    doc.color = data.get("color", doc.color)
    doc.icon = data.get("icon", doc.icon)
    if "tasks" in data:
        doc.set("tasks", [])
        for task in data.get("tasks") or []:
            doc.append("tasks", {
                "name": task.get("id") if task.get("id") and not str(task.get("id")).startswith(("pt-", "tk-p-", "tk-")) else None,
                "title": task.get("title"),
                "description": task.get("description"),
                "status": task.get("status") or ("انجام‌شده" if task.get("completed") else "انجام‌نشده"),
                "priority": task.get("priority") or "متوسط",
                "due_date": task.get("dueDate") or task.get("due_date"),
                "user": frappe.session.user,
                "completed": 1 if task.get("completed") else 0,
            })
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _api_response({"project": _project_to_frontend(doc)})


@frappe.whitelist()
def delete_project(name):
    _check_auth()
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
    frappe.delete_doc("Hambaft Contact", name, ignore_permissions=True)
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
    else:
        conversation.save(ignore_permissions=True)

    frappe.db.commit()
    return _api_response({"text": response_text, "conversation_id": conversation.name})


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
                                  filters={"habit": h.name, "status": "done"},
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
