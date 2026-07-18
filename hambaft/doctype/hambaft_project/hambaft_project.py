# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
import json


class HambaftProject(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("عنوان پروژه الزامی است"))
        if not self.user:
            self.user = frappe.session.user
        # Prevent self-referencing parent
        if self.parent_project and self.parent_project == self.name:
            frappe.throw(_("Project cannot be its own parent"))

    def on_update(self):
        # Recompute actual_minutes from linked Task sessions
        self._update_actual_minutes()
        frappe.clear_document_cache(self.doctype, self.name)

    def _update_actual_minutes(self):
        """Compute actual tracked minutes from all tasks linked to this project."""
        task_names = frappe.get_all(
            "Task",
            filters={"project": self.name},
            fields=["name"],
        )
        if not task_names:
            total = 0
        else:
            names = [t.name for t in task_names]
            total = frappe.db.sql(
                """SELECT COALESCE(SUM(duration_minutes), 0)
                   FROM `tabHambaft Task Session`
                   WHERE task IN (%s) AND status IN ('paused', 'completed')"""
                % ",".join(["%s"] * len(names)),
                names,
            )[0][0] or 0

        if total != (self.actual_minutes or 0):
            frappe.db.set_value(
                "Hambaft Project", self.name,
                "actual_minutes", int(total),
                update_modified=False,
            )

    def get_subprojects(self):
        return frappe.get_all(
            "Hambaft Project",
            filters={"parent_project": self.name, "user": self.user},
            fields="*",
            order_by="title asc",
        )

    def get_blocked_by_projects(self):
        blocked = json.loads(self.blocked_by_json or "[]") if self.blocked_by_json else []
        if not blocked:
            return []
        return frappe.get_all(
            "Hambaft Project",
            filters={"name": ["in", blocked]},
            fields=["name", "title", "status"],
        )

    def is_blocked(self):
        blocked = json.loads(self.blocked_by_json or "[]") if self.blocked_by_json else []
        if not blocked:
            return False, None
        for dep_id in blocked:
            dep_status = frappe.db.get_value("Hambaft Project", dep_id, "status")
            if dep_status and dep_status not in ("تکمیل‌شده",):
                dep_title = frappe.db.get_value("Hambaft Project", dep_id, "title") or dep_id
                return True, dep_title
        return False, None

    def compute_progress(self):
        """Compute progress based on linked Task statuses.
        Quality-aware: milestone tasks count as 3x, key tasks as 2x, normal as 1x.
        Also recognizes Persian done statuses.
        """
        _done_statuses = {"done", "completed", "انجام‌شده", "انجام شده"}
        tasks = frappe.get_all(
            "Task",
            filters={"project": self.name},
            fields=["status", "importance"],
        )
        if not tasks:
            return 0

        total_weight = 0
        done_weight = 0
        for t in tasks:
            imp = t.importance or "عادی"
            if imp == "نقطه‌عطف":
                w = 3
            elif imp == "کلیدی":
                w = 2
            else:
                w = 1
            total_weight += w
            if t.status in _done_statuses:
                done_weight += w

        if total_weight <= 0:
            return 0
        return int((done_weight / total_weight) * 100)
