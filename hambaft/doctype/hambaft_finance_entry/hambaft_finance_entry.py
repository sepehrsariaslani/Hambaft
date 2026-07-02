# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftFinanceEntry(Document):
    def before_save(self):
        self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.amount:
            frappe.throw(_("Amount is required"))
        if not self.user:
            self.user = frappe.session.user
