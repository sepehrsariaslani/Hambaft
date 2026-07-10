# Copyright (c) 2026, Hambaft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class HambaftArea(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw("عنوان حوزه الزامی است")
        if not self.user:
            self.user = frappe.session.user

    def get_projects(self):
        """Get all projects linked to this area."""
        return frappe.get_all(
            "Hambaft Project",
            filters={"area": self.name, "user": self.user},
            fields="*",
            order_by="title asc",
        )

    def get_tasks(self):
        """Get all tasks linked to this area (directly or via project)."""
        return frappe.get_all(
            "Task",
            filters={"area": self.name, "user": self.user},
            fields="*",
            order_by="scheduled_date asc, priority asc",
        )

    def get_tracked_minutes(self):
        """Compute total tracked minutes across all tasks in this area."""
        # Direct area tasks
        task_names = frappe.get_all(
            "Task",
            filters={"area": self.name, "user": self.user},
            fields=["name"],
        )
        if not task_names:
            return 0
        names = [t.name for t in task_names]
        total = frappe.db.sql(
            """SELECT COALESCE(SUM(duration_minutes), 0)
               FROM `tabHambaft Task Session`
               WHERE task IN (%s) AND status IN ('paused', 'completed')"""
            % ",".join(["%s"] * len(names)),
            names,
        )[0][0] or 0
        return int(total)

    def get_summary(self):
        """Return area summary with projects, tasks, tracked time."""
        projects = self.get_projects()
        tasks = self.get_tasks()
        tracked_minutes = self.get_tracked_minutes()
        goals = frappe.get_all(
            "Goal",
            filters={"area": self.name, "user": self.user},
            fields=["name", "title", "status", "progress_percent"],
        )
        completed_tasks = sum(1 for t in tasks if t.get("status") == "done")
        completed_projects = sum(1 for p in projects if p.get("status") == "تکمیل‌شده")
        return {
            "area": {
                "name": self.name,
                "title": self.title,
                "description": self.description or "",
                "color": self.color,
                "icon": self.icon,
                "status": self.status,
            },
            "project_count": len(projects),
            "completed_projects": completed_projects,
            "task_count": len(tasks),
            "completed_tasks": completed_tasks,
            "goal_count": len(goals),
            "tracked_minutes": tracked_minutes,
            "projects": projects,
            "tasks": tasks,
            "goals": goals,
        }
