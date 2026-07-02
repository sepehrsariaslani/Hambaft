# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document


class Goal(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.user:
            self.user = frappe.session.user
        if self.target_value and self.target_value <= 0:
            frappe.throw(_("Target value must be greater than 0"))

        if self.start_date and self.target_date and self.target_date < self.start_date:
            frappe.throw(_("Target date cannot be before start date"))

        if self.target_value and self.current_value:
            if self.current_value > self.target_value:
                frappe.msgprint(_("Current value exceeds target value"), indicator="orange")
            self.progress_percent = min(100, (self.current_value / self.target_value) * 100)

    def on_update(self):
        if self.status == "completed" and not self.progress_percent:
            self.progress_percent = 100


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False