# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftFinanceCategory(Document):
    def before_validate(self):
        if not self.user:
            self.user = frappe.session.user

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.category_name:
            frappe.throw(_("نام دسته الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        # Prevent self-referencing
        if self.parent_category == self.name:
            frappe.throw(_("دسته والد نمی‌تواند خود دسته باشد"))
        if self.monthly_budget_default and self.monthly_budget_default < 0:
            frappe.throw(_("بودجه پیش‌فرض نمی‌تواند منفی باشد"))


def validate(doc, method=None):
    HambaftFinanceCategory.validate(doc)


def before_save(doc, method=None):
    HambaftFinanceCategory.before_save(doc)
