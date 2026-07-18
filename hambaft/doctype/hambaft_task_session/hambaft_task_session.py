# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime
from datetime import datetime


class HambaftTaskSession(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.task:
            frappe.throw("تسک الزامی است")
        if not self.user:
            self.user = frappe.session.user
        # Compute duration if we have start and stop
        if self.started_at and self.stopped_at:
            self._compute_duration()

    def _compute_duration(self):
        """Compute duration in minutes from started_at and stopped_at."""
        try:
            if isinstance(self.started_at, str):
                start = datetime.strptime(self.started_at[:19], "%Y-%m-%d %H:%M:%S")
            else:
                start = self.started_at
            if isinstance(self.stopped_at, str):
                stop = datetime.strptime(self.stopped_at[:19], "%Y-%m-%d %H:%M:%S")
            else:
                stop = self.stopped_at
            delta = stop - start
            self.duration_minutes = int(delta.total_seconds() / 60)
        except Exception:
            pass

    def on_update(self):
        """Update task's actual_minutes when session is paused or completed."""
        if self.status in ("paused", "completed"):
            self._update_task_actual_minutes()
        frappe.clear_document_cache(self.doctype, self.name)

    def _update_task_actual_minutes(self):
        """Recalculate the total actual_minutes for the linked task."""
        if not self.task:
            return
        total = frappe.db.sql(
            """SELECT COALESCE(SUM(duration_minutes), 0)
               FROM `tabHambaft Task Session`
               WHERE task=%s AND status IN ('paused', 'completed')""",
            self.task,
        )[0][0] or 0
        frappe.db.set_value("Task", self.task, "actual_minutes", int(total), update_modified=True)

    def after_insert(self):
        """When a new session is created, update task status to in_progress if needed."""
        if self.task and self.status == "active":
            task_status = frappe.db.get_value("Task", self.task, "status")
            if task_status in ("inbox", "not_started", "next", "today", "someday"):
                frappe.db.set_value("Task", self.task, "status", "in_progress", update_modified=True)
