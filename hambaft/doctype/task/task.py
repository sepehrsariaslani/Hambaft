# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class Task(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.user:
            self.user = frappe.session.user
        if self.status == "done" and not self.completed_on:
            self.completed_on = now_datetime()

    def on_update(self):
        if self.status == "done" and self.goal:
            goal = frappe.get_doc("Goal", self.goal)
            if goal.current_value is not None:
                goal.current_value += 1
                goal.save(ignore_permissions=True)
        frappe.clear_document_cache(self.doctype, self.name)


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False