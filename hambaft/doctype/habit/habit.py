# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document


class Habit(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.user:
            self.user = frappe.session.user
        if self.target_days and self.target_days < 1:
            frappe.throw(_("Target days must be at least 1"))

    def on_update(self):
        pass


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False