# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftRecurrenceRule(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.user:
            self.user = frappe.session.user
        if not self.start_date:
            frappe.throw(_("Start date is required"))
        if self.frequency not in ("روزانه", "هفتگی", "ماهانه", "سالانه", "سفارشی"):
            frappe.throw(_("Invalid frequency value"))
        if self.interval is not None and self.interval < 1:
            frappe.throw(_("Interval must be at least 1"))
        if self.day_of_month and (self.day_of_month < 1 or self.day_of_month > 31):
            frappe.throw(_("Day of month must be between 1 and 31"))
        if self.end_date and self.start_date and self.end_date < self.start_date:
            frappe.throw(_("End date cannot be before start date"))

    def on_update(self):
        frappe.clear_document_cache(self.doctype, self.name)
