# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class CalendarEvent(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("عنوان اجباری است"))
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            frappe.throw(_("زمان پایان باید بعد از زمان شروع باشد"))
        if not self.user:
            self.user = frappe.session.user


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
