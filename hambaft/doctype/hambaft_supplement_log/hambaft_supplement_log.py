# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime


class HambaftSupplementLog(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.log_date:
            self.log_date = getdate()
        if not self.taken_at:
            self.taken_at = now_datetime()

    def validate(self):
        if not self.supplement:
            frappe.throw(_("انتخاب مکمل الزامی است"))
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
