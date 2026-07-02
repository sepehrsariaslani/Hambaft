import frappe
from frappe.model.document import Document


class HambaftAIConversation(Document):
    def before_insert(self):
        if not self.started_at:
            self.started_at = frappe.utils.now_datetime()

    def on_update(self):
        if self.status == "بسته":
            self.last_message_at = frappe.utils.now_datetime()


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
