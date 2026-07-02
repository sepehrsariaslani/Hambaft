# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftTask(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.user:
            self.user = frappe.session.user

    def on_update(self):
        frappe.clear_document_cache(self.doctype, self.name)
        self._recalculate_project_progress()

    def _recalculate_project_progress(self):
        """Recalculate parent project progress when task status changes."""
        if self.project:
            tasks = frappe.get_all(
                "Hambaft Task",
                filters={"project": self.project},
                fields=["name", "status"]
            )
            if tasks:
                completed = sum(1 for t in tasks if t.status == "تکمیل‌شده")
                progress = (completed / len(tasks)) * 100
                frappe.db.set_value("Hambaft Project", self.project, "progress", progress)
