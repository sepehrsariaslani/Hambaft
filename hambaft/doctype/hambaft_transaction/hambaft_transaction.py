# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftTransaction(Document):
    def validate(self):
        if not self.transaction_type:
            frappe.throw(_("نوع تراکنش الزامی است"))
        if not self.amount or self.amount <= 0:
            frappe.throw(_("مبلغ باید بزرگتر از صفر باشد"))
        if not self.account:
            frappe.throw(_("حساب مبدأ الزامی است"))
        if not self.user:
            self.user = frappe.session.user

        # Transfer validation
        if self.transaction_type == "انتقال" and not self.to_account:
            frappe.throw(_("برای انتقال، حساب مقصد الزامی است"))
        if self.transaction_type == "انتقال" and self.account == self.to_account:
            frappe.throw(_("حساب مبدأ و مقصد نمی‌توانند یکسان باشند"))

        # Verify account ownership
        self._verify_account_ownership()

    def _verify_account_ownership(self):
        """Ensure the linked account belongs to the current user."""
        if self.account:
            acct_user = frappe.db.get_value("Hambaft Finance Account", self.account, "user")
            if acct_user and acct_user != self.user and "System Manager" not in frappe.get_roles():
                frappe.throw(_("حساب انتخابی متعلق به شما نیست"))
        if self.to_account:
            to_user = frappe.db.get_value("Hambaft Finance Account", self.to_account, "user")
            if to_user and to_user != self.user and "System Manager" not in frappe.get_roles():
                frappe.throw(_("حساب مقصد متعلق به شما نیست"))

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.currency:
            self.currency = frappe.db.get_value("Hambaft Finance Account", self.account, "currency")

    def on_update(self):
        accounts_to_update = set()
        if self.account:
            accounts_to_update.add(self.account)
        if self.to_account:
            accounts_to_update.add(self.to_account)
        if self.amended_from:
            old_doc = frappe.get_doc("Hambaft Transaction", self.amended_from)
            if old_doc.account:
                accounts_to_update.add(old_doc.account)
            if old_doc.to_account:
                accounts_to_update.add(old_doc.to_account)

        for account_name in accounts_to_update:
            account = frappe.get_doc("Hambaft Finance Account", account_name)
            account._recalculate_balance()

    def on_cancel(self):
        accounts_to_update = set()
        if self.account:
            accounts_to_update.add(self.account)
        if self.to_account:
            accounts_to_update.add(self.to_account)

        for account_name in accounts_to_update:
            account = frappe.get_doc("Hambaft Finance Account", account_name)
            account._recalculate_balance()
