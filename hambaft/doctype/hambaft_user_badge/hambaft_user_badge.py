import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class HambaftUserBadge(Document):
    def before_insert(self):
        """Set earned_at timestamp on creation."""
        if not self.earned_at:
            self.earned_at = now_datetime()

        # Prevent duplicate badge awards
        if frappe.db.exists("Hambaft User Badge", {"user": self.user, "badge": self.badge}):
            frappe.throw("این نشان قبلاً به این کاربر داده شده است.")
