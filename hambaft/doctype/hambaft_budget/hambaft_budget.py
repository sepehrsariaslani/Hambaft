# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftBudget(Document):
    def validate(self):
        if not self.budget_title:
            frappe.throw(_("عنوان بودجه الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        if not self.jalali_month:
            frappe.throw(_("ماه الزامی است"))
        if not self.jalali_year:
            frappe.throw(_("سال الزامی است"))
        if self.jalali_year and (self.jalali_year < 1300 or self.jalali_year > 1500):
            frappe.throw(_("سال باید بین ۱۳۰۰ و ۱۵۰۰ باشد"))
        if self.start_date and self.end_date and self.start_date > self.end_date:
            frappe.throw(_("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد"))
        if self.total_income_plan and self.total_income_plan < 0:
            frappe.throw(_("برنامه درآمد نمی‌تواند منفی باشد"))
        if self.total_expense_plan and self.total_expense_plan < 0:
            frappe.throw(_("برنامه هزینه نمی‌تواند منفی باشد"))
        if self.total_saving_plan and self.total_saving_plan < 0:
            frappe.throw(_("برنامه پس‌انداز نمی‌تواند منفی باشد"))

        # Compute budget category fields
        for row in self.categories:
            row.remaining_amount = (row.planned_amount or 0) - (row.actual_amount or 0)
            if row.planned_amount and row.planned_amount > 0:
                row.percentage_used = ((row.actual_amount or 0) / row.planned_amount) * 100
            else:
                row.percentage_used = 0

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
