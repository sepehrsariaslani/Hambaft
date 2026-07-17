# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe.model.document import Document


class HambaftContactLink(Document):
    def validate(self):
        # Prevent self-duplicate: same contact + same entity + same role
        duplicate = frappe.db.exists(
            "Hambaft Contact Link",
            {
                "user": self.user,
                "contact": self.contact,
                "entity_type": self.entity_type,
                "entity": self.entity,
                "role": self.role,
                "status": "active",
                "name": ["!=", self.name or "___"],
            },
        )
        if duplicate:
            frappe.throw("This contact is already linked to this entity with the same role.")

        # Validate entity exists
        if self.entity_type and self.entity:
            doctype_map = {
                "goal": "Hambaft Goal",
                "project": "Hambaft Project",
                "task": "Hambaft Task",
                "occasion": "Hambaft Occasion",
                "document": "Hambaft Document",
                "finance": "Hambaft Finance Entry",
            }
            target_dt = doctype_map.get(self.entity_type)
            if target_dt and not frappe.db.exists(target_dt, self.entity):
                frappe.throw(f"{target_dt} '{self.entity}' does not exist.")
