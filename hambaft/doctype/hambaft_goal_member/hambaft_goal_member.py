# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class HambaftGoalMember(Document):
    def validate(self):
        # Prevent duplicate membership
        duplicate = frappe.db.exists(
            "Hambaft Goal Member",
            {
                "goal": self.goal,
                "user": self.user,
                "status": "فعال",
                "name": ["!=", self.name or "___"],
            },
        )
        if duplicate:
            frappe.throw("This user is already an active member of this goal.")
