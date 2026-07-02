# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftMeasurement(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.measured_on:
            self.measured_on = frappe.utils.now_datetime()

    def validate(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.measurement_type:
            frappe.throw(_("Measurement type is required"))
        if self.value is None:
            frappe.throw(_("Value is required"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
