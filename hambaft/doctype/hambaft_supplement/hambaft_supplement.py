# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class HambaftSupplement(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.supplement_name:
            frappe.throw(_("نام مکمل الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        if self.start_date and self.end_date:
            if getdate(self.end_date) < getdate(self.start_date):
                frappe.throw(_("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
