# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftTimeBlock(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("عنوان اجباری است"))
        if not self.block_date:
            frappe.throw(_("تاریخ اجباری است"))
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            frappe.throw(_("زمان پایان باید بعد از زمان شروع باشد"))
        if not self.user:
            self.user = frappe.session.user

    def on_update(self):
        frappe.clear_document_cache(self.doctype, self.name)

    def has_permission(self, ptype, user=None):
        if user is None:
            user = frappe.session.user
        if "Administrator" in frappe.get_roles(user):
            return True
        if self.user == user:
            return True
        return False
