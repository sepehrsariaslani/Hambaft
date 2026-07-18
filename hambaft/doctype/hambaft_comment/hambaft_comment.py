# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class HambaftComment(Document):
    def validate(self):
        if not self.body or not self.body.strip():
            frappe.throw("Comment body cannot be empty.")
