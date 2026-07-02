import frappe
from frappe.model.document import Document


class HambaftAITask(Document):
    def on_update(self):
        if self.status == "انجام‌شده" and not self.completed_on:
            self.completed_on = frappe.utils.now_datetime()


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
