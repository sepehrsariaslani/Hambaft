# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftQuickCapture(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.created_on:
            self.created_on = frappe.utils.now_datetime()

    def validate(self):
        if not self.raw_text:
            frappe.throw(_("Raw text is required"))
        if not self.user:
            self.user = frappe.session.user

    @frappe.whitelist()
    def convert_to_doctype(self, target_doctype):
        """Convert this Quick Capture entry into a target document.

        Args:
            target_doctype: One of 'Hambaft Task', 'Hambaft Note',
                'Hambaft Goal', 'Hambaft Calendar Event', 'Hambaft Habit'

        Returns:
            dict with 'name', 'doctype' of the newly created document.
        """
        # --- permission check ---
        if not frappe.has_permission("Hambaft Quick Capture", "write", self):
            frappe.throw(_("Insufficient permissions to convert this capture"))

        # --- already converted guard ---
        if self.status == "پردازش‌شده" and self.converted_name:
            frappe.throw(
                _("This capture has already been converted to {0} ({1})").format(
                    self.converted_doctype, self.converted_name
                )
            )

        # --- routing ---
        router = {
            "Hambaft Task": self._convert_to_task,
            "Hambaft Note": self._convert_to_note,
            "Hambaft Goal": self._convert_to_goal,
            "Hambaft Calendar Event": self._convert_to_event,
            "Hambaft Habit": self._convert_to_habit,
        }

        creator = router.get(target_doctype)
        if not creator:
            frappe.throw(
                _("Unsupported target doctype: {0}").format(target_doctype)
            )

        # --- create the target doc ---
        new_doc = creator()

        # --- update link fields on self ---
        self.status = "پردازش‌شده"
        self.converted_doctype = target_doctype
        self.converted_name = new_doc.name
        self.save(ignore_permissions=False)

        frappe.msgprint(
            _("Successfully converted to {0} ({1})").format(
                target_doctype, new_doc.name
            )
        )
        return {"name": new_doc.name, "doctype": target_doctype}

    # ------------------------------------------------------------------
    # Private per-doctype factory methods
    # ------------------------------------------------------------------

    def _extract_title(self, max_len=200):
        """Use the first non-empty line of raw_text as title."""
        lines = (self.raw_text or "").strip().splitlines()
        title = lines[0].strip() if lines else "بدون عنوان"
        if len(title) > max_len:
            title = title[:max_len - 3] + "..."
        return title

    def _convert_to_task(self):
        doc = frappe.new_doc("Hambaft Task")
        doc.title = self._extract_title()
        doc.description = self.raw_text
        doc.user = self.user
        doc.status = "انجام‌نشده"
        doc.insert()
        return doc

    def _convert_to_note(self):
        doc = frappe.new_doc("Hambaft Note")
        doc.title = self._extract_title()
        doc.content = self.raw_text
        doc.user = self.user
        doc.insert()
        return doc

    def _convert_to_goal(self):
        doc = frappe.new_doc("Hambaft Goal")
        doc.title = self._extract_title()
        doc.user = self.user
        doc.why = self.raw_text
        doc.status = "پیش‌نویس"
        doc.insert()
        return doc

    def _convert_to_event(self):
        doc = frappe.new_doc("Hambaft Calendar Event")
        doc.title = self._extract_title()
        doc.user = self.user
        doc.description = self.raw_text
        doc.event_type = "رویداد"
        # start_datetime / end_datetime are required on the target doc;
        # default to now so the document can be saved.
        now = frappe.utils.now_datetime()
        doc.start_datetime = now
        doc.end_datetime = frappe.utils.add_to_date(now, hours=1)
        doc.insert()
        return doc

    def _convert_to_habit(self):
        doc = frappe.new_doc("Hambaft Habit")
        doc.habit_name = self._extract_title()
        doc.user = self.user
        doc.habit_type = "بله/خیر"
        doc.status = "فعال"
        doc.insert()
        return doc


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
