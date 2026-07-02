# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftBill(Document):
    def validate(self):
        if not self.bill_name:
            frappe.throw(_("نام قبض الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        if not self.amount or self.amount <= 0:
            frappe.throw(_("مبلغ باید بزرگتر از صفر باشد"))
        if not self.due_date:
            frappe.throw(_("سررسید الزامی است"))
        if self.reminder_days_before and self.reminder_days_before < 0:
            frappe.throw(_("روزهای یادآوری نمی‌تواند منفی باشد"))

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        # Auto-mark paid
        if self.status == "پرداخت‌شده" and not self.paid_date:
            self.paid_date = frappe.utils.today()
        if self.status == "پرداخت‌شده" and not self.paid_amount:
            self.paid_amount = self.amount
