# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe.model.document import Document


class Review(Document):
    def validate(self):
        if self.period and self.date:
            pass


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
