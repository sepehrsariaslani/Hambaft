import frappe
from frappe.model.document import Document


class HambaftProfile(Document):
    def before_insert(self):
        """Prevent duplicate profiles for the same user."""
        if self.user and frappe.db.exists("Hambaft Profile", {"user": self.user}):
            frappe.throw("Hambaft Profile already exists for this user")
