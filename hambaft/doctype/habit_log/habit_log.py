# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class HabitLog(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.user:
            self.user = frappe.session.user
        # Check unique (habit, date) per user
        existing = frappe.db.exists(
            "Habit Log",
            {"habit": self.habit, "date": self.date, "name": ["!=", self.name], "user": self.user}
        )
        if existing:
            frappe.throw(_("Log already exists for this habit on {0}").format(self.date))

    def on_update(self):
        self._recalculate_streaks()
        self._trigger_linked_goal_progress()

    def after_insert(self):
        self._trigger_linked_goal_progress()

    def _recalculate_streaks(self):
        habit = frappe.get_doc("Habit", self.habit)
        logs = frappe.get_all(
            "Habit Log",
            filters={"habit": self.habit, "status": "انجام‌شده", "user": self.user},
            fields=["date"],
            order_by="date asc"
        )
        if not logs:
            habit.streak_current = 0
            habit.streak_best = 0
            habit.save(ignore_permissions=True)
            return

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

        today = getdate()
        last_date = dates[-1]
        if (today - last_date).days <= 1:
            habit.streak_current = current
        else:
            habit.streak_current = 0
        habit.streak_best = max(best, habit.streak_best or 0)
        habit.save(ignore_permissions=True)

    def _trigger_linked_goal_progress(self):
        """When a habit log is created/updated, recompute progress for all
        goals that have this habit linked via Goal Habit Link child table."""
        try:
            import json
            # Find all Goal Habit Link rows referencing this habit
            links = frappe.get_all(
                "Goal Habit Link",
                filters={"habit": self.habit},
                fields=["parent"],
                distinct=True,
            )
            if not links:
                return
            goal_names = list({row.parent for row in links})
            for goal_name in goal_names:
                try:
                    goal = frappe.get_doc("Goal", goal_name)
                    pct, detail = goal.compute_progress()
                    goal.progress_percent = pct
                    goal.derived_progress_detail = json.dumps(detail, ensure_ascii=False)
                    if pct >= 100:
                        goal.status = "تکمیل‌شده"
                    goal.save(ignore_permissions=True)
                except Exception:
                    frappe.log_error(f"Auto-trigger goal progress failed for {goal_name}")
            if goal_names:
                frappe.db.commit()
        except Exception:
            # Never let goal recomputation break habit logging
            frappe.log_error("habit_goal_trigger_error", f"Failed to trigger goal progress for habit {self.habit}")


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False