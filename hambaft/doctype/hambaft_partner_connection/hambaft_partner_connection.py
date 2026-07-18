# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class HambaftPartnerConnection(Document):
    def validate(self):
        # Prevent self-connection
        if self.user_a == self.user_b:
            frappe.throw("A user cannot partner with themselves.")

        # Prevent duplicate active connection (either direction)
        existing = frappe.db.exists(
            "Hambaft Partner Connection",
            {
                "status": "فعال",
                "name": ["!=", self.name or "___"],
            },
            filter_or={
                "user_a": self.user_a,
                "user_b": self.user_b,
            },
        )
        if existing:
            # Also check reverse direction
            reverse = frappe.db.exists(
                "Hambaft Partner Connection",
                {
                    "status": "فعال",
                    "name": ["!=", self.name or "___"],
                },
                filter_or={
                    "user_a": self.user_b,
                    "user_b": self.user_a,
                },
            )
            if reverse:
                frappe.throw("An active partner connection already exists between these users.")
