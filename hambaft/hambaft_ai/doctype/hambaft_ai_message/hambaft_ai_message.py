import frappe
from frappe.model.document import Document


class HambaftAIMessage(Document):
    def before_insert(self):
        if not self.timestamp:
            self.timestamp = frappe.utils.now_datetime()
        if self.conversation:
            conv = frappe.get_doc("Hambaft AI Conversation", self.conversation)
            conv.last_message_at = self.timestamp
            conv.save(ignore_permissions=True)


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
