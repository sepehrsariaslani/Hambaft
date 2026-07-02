# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftSavingsGoal(Document):
    def validate(self):
        if not self.goal_name:
            frappe.throw(_("نام هدف الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        if not self.target_amount or self.target_amount <= 0:
            frappe.throw(_("مبلغ هدف باید بزرگتر از صفر باشد"))
        if self.current_amount and self.current_amount < 0:
            frappe.throw(_("مبلغ فعلی نمی‌تواند منفی باشد"))
        if self.monthly_contribution and self.monthly_contribution < 0:
            frappe.throw(_("پرداخت ماهانه نمی‌تواند منفی باشد"))

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        # Compute progress
        if self.target_amount and self.target_amount > 0:
            self.progress = min(((self.current_amount or 0) / self.target_amount) * 100, 100)
        else:
            self.progress = 0
        # Auto-update status
        if self.progress >= 100:
            self.status = "تکمیل‌شده"
