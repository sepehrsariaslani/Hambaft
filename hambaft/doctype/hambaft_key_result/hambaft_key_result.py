# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftKeyResult(Document):
    def validate(self):
        if not self.key_result:
            frappe.throw(_("نتیجه کلیدی الزامی است"))
        if self.target_value and self.target_value > 0 and self.current_value:
            self.progress = min(100, (self.current_value / self.target_value) * 100)
