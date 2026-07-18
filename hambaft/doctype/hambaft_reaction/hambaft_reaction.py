# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class HambaftReaction(Document):
    def validate(self):
        # Prevent duplicate reaction (same user + same entity + same emoji)
        duplicate = frappe.db.exists(
            "Hambaft Reaction",
            {
                "entity_type": self.entity_type,
                "entity": self.entity,
                "user": self.user,
                "emoji": self.emoji,
                "name": ["!=", self.name or "___"],
            },
        )
        if duplicate:
            frappe.throw("You already reacted with this emoji.")
