# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftDailyJournal(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.journal_date:
            frappe.throw(_("تاریخ ژورنال اجباری است"))
        for field in ("mood_score", "energy_score", "stress_score"):
            val = self.get(field)
            if val is not None and (val < 1 or val > 10):
                frappe.throw(_("{0} باید بین ۱ تا ۱۰ باشد").format(self.meta.get_label(field)))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
