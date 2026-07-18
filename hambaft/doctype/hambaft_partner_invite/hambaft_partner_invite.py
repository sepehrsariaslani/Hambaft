# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class HambaftPartnerInvite(Document):
    def validate(self):
        # Prevent inviting self
        if self.invitee and self.inviter == self.invitee:
            frappe.throw("You cannot invite yourself.")

        # Check for existing pending invite between same pair
        if self.invitee and self.status == "در_انتظار":
            duplicate = frappe.db.exists(
                "Hambaft Partner Invite",
                {
                    "inviter": self.inviter,
                    "invitee": self.invitee,
                    "status": "در_انتظار",
                    "name": ["!=", self.name or "___"],
                },
            )
            if duplicate:
                frappe.throw("A pending invite already exists for this user.")

            # Also check if they already have an active connection
            conn = frappe.db.sql(
                """SELECT name FROM `tabHambaft Partner Connection`
                WHERE status = 'فعال'
                AND ((user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s))
                LIMIT 1""",
                (self.inviter, self.invitee, self.invitee, self.inviter),
            )
            if conn:
                frappe.throw("You are already connected with this user.")
