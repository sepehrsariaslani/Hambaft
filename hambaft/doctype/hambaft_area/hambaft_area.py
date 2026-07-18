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
        """Compute total tracked minutes across all tasks in this area
        (direct area tasks + tasks in projects belonging to this area)."""
        # Direct area tasks
        direct_tasks = frappe.get_all(
            "Task",
            filters={"area": self.name, "user": self.user},
            fields=["name"],
        )
        # Tasks in projects belonging to this area
        project_names = frappe.get_all(
            "Hambaft Project",
            filters={"area": self.name, "user": self.user},
            fields=["name"],
        )
        project_tasks = []
        for p in project_names:
            pt = frappe.get_all("Task", filters={"project": p.name}, fields=["name"])
            project_tasks.extend(pt)

        all_task_names = list(set(
            [t.name for t in direct_tasks] + [t.name for t in project_tasks]
        ))
        if not all_task_names:
            return 0
        total = frappe.db.sql(
            """SELECT COALESCE(SUM(duration_minutes), 0)
               FROM `tabHambaft Task Session`
               WHERE task IN (%s) AND status IN ('paused', 'completed')"""
            % ",".join(["%s"] * len(all_task_names)),
            all_task_names,
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
            fields=["name", "title", "status", "progress_percent", "health_state"],
        )
        # Aggregate goal health states
        goal_health_counts = {}
        for g in goals:
            hs = g.get("health_state") or "unknown"
            goal_health_counts[hs] = goal_health_counts.get(hs, 0) + 1
        completed_tasks = sum(1 for t in tasks if t.get("status") in {"done", "completed", "انجام‌شده", "انجام شده"})
        completed_projects = sum(1 for p in projects if p.get("status") in {"تکمیل‌شده", "completed"})
        active_projects = sum(1 for p in projects if p.get("status") in {"فعال", "برنامه‌ریزی", "active"})
        # Count milestones and key tasks
        _done = {"done", "completed", "انجام‌شده", "انجام شده"}
        milestone_total = sum(1 for t in tasks if (t.get("importance") or "عادی") == "نقطه‌عطف")
        milestone_done = sum(1 for t in tasks if (t.get("importance") or "عادی") == "نقطه‌عطف" and t.get("status") in _done)
        key_total = sum(1 for t in tasks if (t.get("importance") or "عادی") == "کلیدی")
        key_done = sum(1 for t in tasks if (t.get("importance") or "عادی") == "کلیدی" and t.get("status") in _done)
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
            "active_project_count": active_projects,
            "completed_projects": completed_projects,
            "task_count": len(tasks),
            "completed_tasks": completed_tasks,
            "milestone_total": milestone_total,
            "milestone_done": milestone_done,
            "key_total": key_total,
            "key_done": key_done,
            "goal_count": len(goals),
            "goal_health_counts": goal_health_counts,
            "tracked_minutes": tracked_minutes,
            "projects": projects,
            "tasks": tasks,
            "goals": goals,
        }
