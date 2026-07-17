# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe.model.document import Document


class HambaftContactRelation(Document):
    def validate(self):
        # Prevent self-relation
        if self.from_contact == self.to_contact:
            frappe.throw("A contact cannot be related to itself.")

        # Prevent duplicate: same pair + same type + same directionality
        if self.directionality == "mutual":
            # For mutual, (A,B) and (B,A) are the same — check both orders
            duplicate = frappe.db.exists(
                "Hambaft Contact Relation",
                {
                    "user": self.user,
                    "relation_type": self.relation_type,
                    "directionality": "mutual",
                    "status": "active",
                    "name": ["!=", self.name or "___"],
                    "from_contact": ["in", [self.from_contact, self.to_contact]],
                    "to_contact": ["in", [self.from_contact, self.to_contact]],
                },
            )
            if duplicate:
                frappe.throw(f"A mutual relation of type '{self.relation_type}' already exists between these contacts.")
        else:
            # For directed, only (from,to) matters
            duplicate = frappe.db.exists(
                "Hambaft Contact Relation",
                {
                    "user": self.user,
                    "from_contact": self.from_contact,
                    "to_contact": self.to_contact,
                    "relation_type": self.relation_type,
                    "directionality": "directed",
                    "status": "active",
                    "name": ["!=", self.name or "___"],
                },
            )
            if duplicate:
                frappe.throw(f"A directed relation of type '{self.relation_type}' from this contact already exists.")

        # Validate strength_score range
        if self.strength_score and (self.strength_score < 0 or self.strength_score > 100):
            frappe.throw("Strength score must be between 0 and 100.")
