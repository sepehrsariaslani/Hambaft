from __future__ import annotations

from datetime import date, datetime


ACTIVE_GOAL_STATUSES = {"active", "فعال"}
ACTIVE_BILL_STATUSES = {"pending", "upcoming", "پیش‌رو", "active", "فعال"}
ACTIVE_SUBSCRIPTION_STATUSES = {"active", "فعال"}
DONE_MILESTONE_STATUSES = {"done", "completed", "تکمیل‌شده"}
PRIORITY_ORDER = {
    "urgent": 0,
    "فوری": 0,
    "high": 1,
    "بالا": 1,
    "medium": 2,
    "متوسط": 2,
    "low": 3,
    "پایین": 3,
}


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()


def _parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _priority_rank(value):
    return PRIORITY_ORDER.get(value, 99)


def _first_text(*values):
    for value in values:
        if value:
            return value
    return ""


def select_priority_item(tasks, events, target_date):
    target_day = _parse_date(target_date)

    eligible_tasks = []
    for task in tasks or []:
        due_at = _parse_datetime(task.get("due_date"))
        if due_at and due_at.date() == target_day:
            eligible_tasks.append((task, due_at))

    eligible_tasks.sort(key=lambda item: (_priority_rank(item[0].get("priority")), item[1]))
    if eligible_tasks:
        task, due_at = eligible_tasks[0]
        return {
            "type": "task",
            "title": task.get("title") or "کار بدون عنوان",
            "starts_at": task.get("due_date"),
            "ends_at": None,
            "subtitle": _first_text(task.get("description"), task.get("category")),
            "priority": task.get("priority"),
            "attendees": [],
            "name": task.get("name"),
        }

    agenda = select_agenda(events, target_date, limit=1)
    if agenda:
        first_event = agenda[0]
        return {
            "type": "event",
            "title": first_event.get("title") or "رویداد بدون عنوان",
            "starts_at": first_event.get("starts_at"),
            "ends_at": first_event.get("ends_at"),
            "subtitle": _first_text(first_event.get("location"), first_event.get("event_type")),
            "priority": first_event.get("event_type"),
            "attendees": first_event.get("attendees", []),
            "name": first_event.get("name"),
        }

    if tasks:
        fallback = sorted(
            tasks,
            key=lambda item: (
                _priority_rank(item.get("priority")),
                _parse_datetime(item.get("due_date")) or datetime.max,
            ),
        )[0]
        return {
            "type": "task",
            "title": fallback.get("title") or "کار بدون عنوان",
            "starts_at": fallback.get("due_date"),
            "ends_at": None,
            "subtitle": _first_text(fallback.get("description"), fallback.get("category")),
            "priority": fallback.get("priority"),
            "attendees": [],
            "name": fallback.get("name"),
        }

    return None


def select_agenda(events, target_date, limit=2):
    target_day = _parse_date(target_date)
    items = []
    for event in events or []:
        starts_at = _parse_datetime(event.get("starts_at"))
        if starts_at and starts_at.date() == target_day:
            items.append((starts_at, event))

    items.sort(key=lambda item: item[0])
    return [event for _, event in items[:limit]]


def select_focus_goal(goals, milestones_by_goal):
    active_goals = [
        goal for goal in (goals or []) if goal.get("status") in ACTIVE_GOAL_STATUSES
    ]
    if not active_goals:
        return None

    active_goals.sort(
        key=lambda goal: (
            _parse_date(goal.get("target_date")) or date.max,
            -float(goal.get("progress_percent") or 0),
        )
    )
    goal = active_goals[0]

    next_milestone = None
    milestones = milestones_by_goal.get(goal.get("name"), []) if milestones_by_goal else []
    candidates = [
        milestone
        for milestone in milestones
        if milestone.get("status") not in DONE_MILESTONE_STATUSES
    ]
    candidates.sort(key=lambda item: _parse_date(item.get("target_date")) or date.max)
    if candidates:
        next_milestone = candidates[0].get("milestone_title")

    return {
        "name": goal.get("name"),
        "title": goal.get("title"),
        "progress_percent": goal.get("progress_percent") or 0,
        "target_date": goal.get("target_date"),
        "next_milestone": next_milestone,
    }


def build_finance_snapshot(finance_summary, budgets, bills, subscriptions):
    finance_summary = finance_summary or {}
    budgets = budgets or []
    bills = bills or []
    subscriptions = subscriptions or []

    month_expense = float(finance_summary.get("expense") or 0)

    active_budget = next((item for item in budgets if item.get("status") == "فعال"), None)
    planned_expense = float(active_budget.get("total_expense_plan") or 0) if active_budget else 0
    remaining_budget = max(planned_expense - month_expense, 0) if planned_expense else 0

    payments = []
    for bill in bills:
        if bill.get("status") in ACTIVE_BILL_STATUSES:
            payments.append(
                {
                    "type": "bill",
                    "title": bill.get("bill_name") or "پرداخت",
                    "amount": bill.get("amount") or 0,
                    "due_date": bill.get("due_date"),
                    "icon": bill.get("icon"),
                }
            )
    for subscription in subscriptions:
        if subscription.get("status") in ACTIVE_SUBSCRIPTION_STATUSES:
            payments.append(
                {
                    "type": "subscription",
                    "title": subscription.get("subscription_name") or "اشتراک",
                    "amount": subscription.get("amount") or 0,
                    "due_date": subscription.get("next_billing_date"),
                    "icon": subscription.get("icon"),
                }
            )

    payments.sort(key=lambda item: _parse_date(item.get("due_date")) or date.max)

    return {
        "month_expense": month_expense,
        "remaining_budget": remaining_budget,
        "next_payment": payments[0] if payments else None,
    }


def build_summary_metrics(tasks_due, habits_pending, water_status, finance_snapshot, agenda):
    water_status = water_status or {}
    finance_snapshot = finance_snapshot or {}
    agenda = agenda or []

    return {
        "tasks": {
            "value": len(tasks_due or []),
            "title": "کارهای امروز",
        },
        "habits": {
            "value": len(habits_pending or []),
            "title": "عادت‌ها",
        },
        "budget": {
            "value": finance_snapshot.get("remaining_budget") or 0,
            "title": "بودجه",
        },
        "water_sleep": {
            "current": water_status.get("consumed_ml") or 0,
            "target": water_status.get("target_ml") or 0,
            "percent": water_status.get("percent") or 0,
            "title": "آب و خواب",
        },
        "next_plan": {
            "title": agenda[0].get("title") if agenda else "",
            "starts_at": agenda[0].get("starts_at") if agenda else None,
        },
    }
