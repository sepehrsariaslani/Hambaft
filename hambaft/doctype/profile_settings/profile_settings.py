import frappe
from frappe.model.document import Document


class ProfileSettings(Document):
    def before_insert(self):
        existing = frappe.db.exists("Profile Settings", {"user": self.user})
        if existing:
            frappe.throw("Profile Settings already exists for this user")


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
