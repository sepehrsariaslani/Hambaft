# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftAISuggestion(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.created_on:
            self.created_on = frappe.utils.now_datetime()

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.message:
            frappe.throw(_("Message is required"))
        if not self.user:
            self.user = frappe.session.user

    def on_update(self):
        if self.status == "پذیرفته‌شده" and not self.accepted_on:
            self.accepted_on = frappe.utils.now_datetime()


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
