# -*- coding: utf-8 -*-
"""
Migration: Move Hambaft Task child-table rows into main Task records.

Before this migration, projects stored tasks in a child table (Hambaft Task).
The new architecture uses real Task doctype records with project=<project_name>.

This patch:
1. For each Hambaft Project that has child-table tasks:
   - Creates a real Task record for each child row (if one doesn't already exist)
   - Links it to the project via task.project = project_name
2. Does NOT delete the child-table rows (safe migration — they become inert)
3. Handles idempotency: skips if a Task with matching title/project already exists

Run via:
  bench --site <site> execute hambaft.hambaft.api.run_project_tasks_migration
  OR
  bench --site <site> execute hambaft.hambaft.patches.migrate_project_tasks.execute

Do not use `hambaft.patches...` in this repo layout. The importable Python package
is `hambaft.hambaft`, not a top-level `hambaft.patches`.
"""

from __future__ import unicode_literals
import frappe
import json


_DONE_STATUSES = {"done", "completed", "انجام‌شده", "انجام شده"}
_STATUS_FA_TO_EN = {
    "انجام‌شده": "done",
    "انجام شده": "done",
    "در حال انجام": "in_progress",
    "در_حال_انجام": "in_progress",
    "انجام‌نشده": "inbox",
    "انجام نشده": "inbox",
    "لغو‌شده": "dropped",
    "لغو شده": "dropped",
}


def execute():
    """Migrate child-table tasks to real Task records."""
    if not frappe.db.exists("DocType", "Hambaft Task"):
        # Child table doctype doesn't exist — nothing to migrate
        return

    if not frappe.db.exists("DocType", "Task"):
        return

    projects = frappe.get_all(
        "Hambaft Project",
        fields=["name", "user", "area", "goal"],
    )

    created = 0
    skipped = 0

    for proj in projects:
        doc = frappe.get_doc("Hambaft Project", proj.name)
        child_tasks = doc.get("tasks") or []

        if not child_tasks:
            continue

        for row in child_tasks:
            title = getattr(row, "title", None)
            if not title:
                continue

            status = getattr(row, "status", "انجام‌نشده") or "انجام‌نشده"
            status = _STATUS_FA_TO_EN.get(status, status)

            # Check if a matching Task already exists
            existing = frappe.get_all(
                "Task",
                filters={
                    "project": proj.name,
                    "title": title,
                    "user": proj.user or frappe.session.user,
                },
                fields=["name"],
                limit=1,
            )

            if existing:
                skipped += 1
                continue

            # Create a real Task record
            task_doc = frappe.new_doc("Task")
            task_doc.title = title
            task_doc.description = getattr(row, "description", "") or ""
            task_doc.project = proj.name
            task_doc.status = status
            task_doc.priority = getattr(row, "priority", "متوسط") or "متوسط"
            task_doc.user = proj.user or frappe.session.user
            task_doc.area = proj.area or None
            task_doc.goal = proj.goal or None
            task_doc.due_date = getattr(row, "due_date", None) or None
            task_doc.importance = "عادی"  # default — child table didn't have this
            task_doc.insert(ignore_permissions=True)
            created += 1

    frappe.db.commit()

    print(f"[migrate_project_tasks] Created {created} Task records, skipped {skipped} (already exist)")
