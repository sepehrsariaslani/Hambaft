from __future__ import annotations

import json
import random
from datetime import datetime, date, timedelta

import frappe
from frappe import _
from frappe.utils import now_datetime, getdate, today, cint, flt
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

    settings = frappe.db.get_value("Profile Settings", {"user": frappe.session.user},
                                   ["onboarding_completed", "onboarding_step"], as_dict=True)
    return settings


def _owner_filter():
    return {"user": frappe.session.user}


def _ensure_settings():
    """Ensure ProfileSettings exists for current user."""
    existing = frappe.db.get_value("Profile Settings", {"user": frappe.session.user}, "name")
    if not existing:
        doc = frappe.new_doc("Profile Settings")
        doc.insert()
        frappe.db.commit()


def _api_response(data=None, status="success", message=None):
    resp = {"status": status}
    if data is not None:
        resp["data"] = data
    if message:
        resp["message"] = message
    return resp


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
    settings = frappe.db.get_value("Profile Settings", {"user": user.name},
                                   ["onboarding_completed", "onboarding_step"], as_dict=True)

    return {
        "status": "success",
        "data": {
            "user": {
                "name": user.name,
                "email": user.email,
                "display_name": user.full_name or user.first_name or user.name,
            },
            "onboarding_completed": bool(settings.onboarding_completed) if settings else False,
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
    settings = frappe.db.get_value("Profile Settings", {"user": frappe.session.user},
                                   "*", as_dict=True)
    if not settings:
        doc = frappe.new_doc("Profile Settings")
        doc.insert()
        frappe.db.commit()
        settings = doc.as_dict()
    return _api_response({"settings": settings})


@frappe.whitelist()
def update_settings(data):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    settings = frappe.db.get_value("Profile Settings", {"user": frappe.session.user},
                                   "*", as_dict=True)
    if settings:
        doc = frappe.get_doc("Profile Settings", settings.name)
        doc.update(data)
    else:
        doc = frappe.new_doc("Profile Settings")
        doc.update(data)
    doc.save()
    frappe.db.commit()
    return _api_response({"settings": doc.as_dict()})


@frappe.whitelist()
def complete_onboarding_step(step):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    settings = frappe.db.get_value("Profile Settings", {"user": frappe.session.user},
                                   "*", as_dict=True)
    if settings:
        doc = frappe.get_doc("Profile Settings", settings.name)
    else:
        doc = frappe.new_doc("Profile Settings")
    doc.onboarding_step = cint(step)
    doc.save()
    frappe.db.commit()
    return _api_response({"settings": doc.as_dict()})


@frappe.whitelist()
def finish_onboarding():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    settings = frappe.db.get_value("Profile Settings", {"user": frappe.session.user},
                                   "*", as_dict=True)
    if settings:
        doc = frappe.get_doc("Profile Settings", settings.name)
    else:
        doc = frappe.new_doc("Profile Settings")
    doc.onboarding_completed = 1
    doc.onboarding_step = 5
    doc.save()
    frappe.db.commit()
    return _api_response({"settings": doc.as_dict()})


# ─── Onboarding ─────────────────────────────────────────────────

@frappe.whitelist()
def get_onboarding_status():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    settings = frappe.db.get_value("Profile Settings", {"user": frappe.session.user},
                                   ["onboarding_completed", "onboarding_step"], as_dict=True)
    if not settings:
        return _api_response({"completed": False, "current_step": 0, "total_steps": 5})
    return _api_response({
        "completed": bool(settings.onboarding_completed),
        "current_step": settings.onboarding_step or 0,
        "total_steps": 5
    })


@frappe.whitelist()
def submit_onboarding_step(step, data=None):
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required", frappe.AuthenticationError)
    if isinstance(data, str):
        data = json.loads(data)
    step = cint(step)
    settings = frappe.db.get_value("Profile Settings", {"user": frappe.session.user},
                                   "*", as_dict=True)
    if settings:
        doc = frappe.get_doc("Profile Settings", settings.name)
    else:
        doc = frappe.new_doc("Profile Settings")
    if data:
        doc.update(data)
    doc.onboarding_step = step
    doc.save()
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


# ─── Scheduled Tasks ────────────────────────────────────────────

def daily_maintenance():
    """Daily maintenance: recreate recurring tasks, pre-compute scores."""
    pass


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
