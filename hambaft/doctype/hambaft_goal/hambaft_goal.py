# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftGoal(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("عنوان هدف الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        if self.start_date and self.target_date and self.start_date > self.target_date:
            frappe.throw(_("تاریخ شروع نمی‌تواند بعد از تاریخ هدف باشد"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
