import frappe
from frappe.model.document import Document


class WaterLog(Document):
    def validate(self):
        # Compute total_ml from completed_glasses * glass_size_ml
        self.total_ml = (self.completed_glasses or 0) * (self.glass_size_ml or 0)

        # Upsert pattern: if log exists for this user+log_date, update it
        existing = frappe.db.exists(
            "Water Log",
            {"log_date": self.log_date, "user": self.user, "name": ["!=", self.name]}
        )
        if existing:
            existing_doc = frappe.get_doc("Water Log", existing)
            existing_doc.goal_glasses = self.goal_glasses
            existing_doc.completed_glasses = self.completed_glasses
            existing_doc.glass_size_ml = self.glass_size_ml
            existing_doc.total_ml = self.total_ml
            existing_doc.reminder_interval_minutes = self.reminder_interval_minutes
            if self.notes:
                existing_doc.notes = self.notes
            existing_doc.save(ignore_permissions=True)
            frappe.throw("Updated existing water log for this date")


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
