# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftFinanceAccount(Document):
    def validate(self):
        if not self.account_name:
            frappe.throw(_("نام حساب الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        if self.is_new():
            self.current_balance = self.opening_balance or 0

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def on_update(self):
        self._recalculate_balance()

    def _recalculate_balance(self):
        """Recalculate current_balance from all transactions."""
        opening = self.opening_balance or 0

        credits = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabHambaft Transaction`
            WHERE account = %s
              AND transaction_type IN ('درآمد', 'پس‌انداز')
              AND docstatus != 2
        """, self.name)[0][0] or 0

        debits = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabHambaft Transaction`
            WHERE account = %s
              AND transaction_type IN ('هزینه', 'پرداخت بدهی')
              AND docstatus != 2
        """, self.name)[0][0] or 0

        transfers_out = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabHambaft Transaction`
            WHERE account = %s
              AND transaction_type = 'انتقال'
              AND docstatus != 2
        """, self.name)[0][0] or 0

        transfers_in = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabHambaft Transaction`
            WHERE to_account = %s
              AND transaction_type = 'انتقال'
              AND docstatus != 2
        """, self.name)[0][0] or 0

        new_balance = opening + credits + transfers_in - debits - transfers_out

        if new_balance != self.current_balance:
            self.current_balance = new_balance
            frappe.db.set_value(self.doctype, self.name, "current_balance", new_balance)
