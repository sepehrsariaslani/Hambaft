# -*- coding: utf-8 -*-
# Copyright (c) 2026, Sepehr
# License: MIT

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import nowdate


class HambaftDecisionLog(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.decision_date:
            self.decision_date = nowdate()

    def validate(self):
        if not self.user:
            self.user = frappe.session.user

        if not self.decision_title:
            frappe.throw(_("عنوان تصمیم الزامی است"))

        if not self.decision_date:
            frappe.throw(_("تاریخ تصمیم الزامی است"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
