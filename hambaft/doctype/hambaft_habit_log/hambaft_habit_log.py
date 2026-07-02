# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime


class HambaftHabitLog(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.logged_at:
            self.logged_at = now_datetime()

    def validate(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.habit:
            frappe.throw(_("Habit is required"))
        if not self.log_date:
            frappe.throw(_("Date is required"))
        # Check unique (habit, log_date) per user
        existing = frappe.db.exists(
            "Hambaft Habit Log",
            {"habit": self.habit, "log_date": self.log_date, "name": ["!=", self.name], "user": self.user}
        )
        if existing:
            frappe.throw(_("Log already exists for this habit on {0}").format(self.log_date))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
