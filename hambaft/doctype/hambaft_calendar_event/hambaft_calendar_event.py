# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftCalendarEvent(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("عنوان اجباری است"))
        if not self.user:
            self.user = frappe.session.user
        if self.start_datetime and self.end_datetime:
            if self.end_datetime <= self.start_datetime:
                frappe.throw(_("زمان پایان باید بعد از زمان شروع باشد"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
