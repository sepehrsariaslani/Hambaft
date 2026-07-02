# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftSubscription(Document):
    def validate(self):
        if not self.subscription_name:
            frappe.throw(_("نام اشتراک الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        if not self.amount or self.amount <= 0:
            frappe.throw(_("مبلغ باید بزرگتر از صفر باشد"))
        if not self.billing_cycle:
            frappe.throw(_("چرخه صورت‌حساب الزامی است"))
        if not self.next_billing_date:
            frappe.throw(_("تاریخ صورت‌حساب بعدی الزامی است"))
        if self.start_date and self.end_date and self.start_date > self.end_date:
            frappe.throw(_("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد"))

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
