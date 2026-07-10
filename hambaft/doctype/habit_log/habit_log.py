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


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False