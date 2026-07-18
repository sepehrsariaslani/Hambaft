import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class HambaftUserBlock(Document):
    def before_insert(self):
        if not self.created_at:
            self.created_at = now_datetime()

        # Prevent duplicate blocks
        if frappe.db.exists("Hambaft User Block", {
            "blocked_by": self.blocked_by,
            "blocked_user": self.blocked_user,
        }):
            frappe.throw("این کاربر قبلاً مسدود شده است.")
