import frappe
from frappe.model.document import Document


class MoodEnergyLog(Document):
    def validate(self):
        existing = frappe.db.exists(
            "Mood Energy Log",
            {"date": self.date, "user": self.user, "name": ["!=", self.name]}
        )
        if existing:
            existing_doc = frappe.get_doc("Mood Energy Log", existing)
            existing_doc.mood = self.mood
            existing_doc.energy = self.energy
            existing_doc.stress = self.stress
            existing_doc.sleep_hours = self.sleep_hours
            if self.note:
                existing_doc.note = self.note
            if self.gratitude:
                existing_doc.gratitude = self.gratitude
            existing_doc.save(ignore_permissions=True)
            frappe.throw("Updated existing mood/energy log for this date")


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
