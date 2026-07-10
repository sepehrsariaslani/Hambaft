# Copyright (c) 2026, Sepehr
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime
import json


class Task(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        # Auto-set area from project if not set
        if self.project and not self.area:
            area = frappe.db.get_value("Hambaft Project", self.project, "area")
            if area:
                self.area = area

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.user:
            self.user = frappe.session.user
        if self.status == "done" and not self.completed_on:
            self.completed_on = now_datetime()
        # Prevent self-referencing parent
        if self.parent_task and self.parent_task == self.name:
            frappe.throw(_("Task cannot be its own parent"))
        # Validate circular parent references
        if self.parent_task:
            self._check_circular_parent()

    def _check_circular_parent(self):
        visited = set()
        current = self.parent_task
        while current:
            if current == self.name:
                frappe.throw(_("Circular parent reference detected"))
            if current in visited:
                break
            visited.add(current)
            current = frappe.db.get_value("Task", current, "parent_task")

    def on_update(self):
        if self.status == "done" and self.goal:
            goal = frappe.get_doc("Goal", self.goal)
            if goal.current_value is not None:
                goal.current_value += 1
                goal.save(ignore_permissions=True)
        # Update blocking_json on blocked-by tasks
        self._sync_blocking_refs()
        # Update parent task status if all children are done
        self._check_parent_completion()
        # Recompute parent project progress when task status changes
        self._recompute_parent_project_progress()
        frappe.clear_document_cache(self.doctype, self.name)

    def _sync_blocking_refs(self):
        """Update blocking_json on tasks that this task blocks."""
        blocked_by = json.loads(self.blocked_by_json or "[]") if self.blocked_by_json else []
        # Find all tasks that list this task in their blocked_by
        all_tasks = frappe.get_all(
            "Task",
            filters={"user": self.user, "blocked_by_json": ["like", f"%{self.name}%"]},
            fields=["name", "blocked_by_json"],
        )
        for t in all_tasks:
            if t.name == self.name:
                continue
            their_blocked = json.loads(t.blocked_by_json or "[]") if t.blocked_by_json else []
            if self.name in their_blocked:
                # Ensure this task's blocking_json includes t.name
                doc = frappe.get_doc("Task", t.name)
                blocking = json.loads(doc.blocking_json or "[]") if doc.blocking_json else []
                if self.name not in blocking:
                    # This task is blocking doc, so doc should be in our blocking_json
                    pass  # Actually we update our own blocking_json below

        # Compute our blocking_json from all tasks that reference us
        blocking = []
        for t in all_tasks:
            if t.name == self.name:
                continue
            their_blocked = json.loads(t.blocked_by_json or "[]") if t.blocked_by_json else []
            if self.name in their_blocked and t.name not in blocking:
                blocking.append(t.name)

        if json.dumps(blocking, ensure_ascii=False) != (self.blocking_json or "[]"):
            frappe.db.set_value(
                "Task", self.name, "blocking_json",
                json.dumps(blocking, ensure_ascii=False),
                update_modified=False,
            )

    def _check_parent_completion(self):
        """If all children of a parent are done, suggest marking parent done."""
        if not self.parent_task:
            return
        siblings = frappe.get_all(
            "Task",
            filters={"parent_task": self.parent_task, "user": self.user, "status": ["!=", "done"]},
            fields=["name"],
        )
        # If no open siblings remain, parent could be auto-completed
        # (We don't auto-complete, but we could trigger a notification)

    def _recompute_parent_project_progress(self):
        """Recompute progress of the parent project when a task changes.
        Uses the quality-aware compute_progress method on HambaftProject.
        """
        if not self.project:
            return
        try:
            project = frappe.get_doc("Hambaft Project", self.project)
            new_progress = project.compute_progress()
            if new_progress != (project.progress or 0):
                frappe.db.set_value(
                    "Hambaft Project", self.project,
                    "progress", new_progress,
                    update_modified=False,
                )
        except Exception:
            # Non-critical: don't fail the task save if project recomputation fails
            pass

    def get_subtasks(self):
        return frappe.get_all(
            "Task",
            filters={"parent_task": self.name, "user": self.user},
            fields="*",
            order_by="creation asc",
        )

    def get_blocked_by_tasks(self):
        blocked = json.loads(self.blocked_by_json or "[]") if self.blocked_by_json else []
        if not blocked:
            return []
        return frappe.get_all(
            "Task",
            filters={"name": ["in", blocked]},
            fields=["name", "title", "status"],
        )

    def get_blocking_tasks(self):
        blocking = json.loads(self.blocking_json or "[]") if self.blocking_json else []
        if not blocking:
            return []
        return frappe.get_all(
            "Task",
            filters={"name": ["in", blocking]},
            fields=["name", "title", "status"],
        )

    def is_blocked(self):
        blocked = json.loads(self.blocked_by_json or "[]") if self.blocked_by_json else []
        if not blocked:
            return False, None
        for dep_id in blocked:
            dep_status = frappe.db.get_value("Task", dep_id, "status")
            if dep_status and dep_status != "done":
                dep_title = frappe.db.get_value("Task", dep_id, "title") or dep_id
                return True, dep_title
        return False, None


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
