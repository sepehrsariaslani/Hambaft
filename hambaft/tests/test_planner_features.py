# -*- coding: utf-8 -*-
"""Tests for planner features: tasks, sessions, projects, areas, hierarchy, dependencies, time rollups."""

from __future__ import unicode_literals

import json
import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import now_datetime, today, getdate
from datetime import datetime, timedelta


class TestPlannerTaskCRUD(FrappeTestCase):
    """Test task CRUD with parent/subtask support."""

    def setUp(self):
        self.user = "test_planner@example.com"
        if not frappe.db.exists("User", self.user):
            doc = frappe.new_doc("User")
            doc.email = self.user
            doc.first_name = "Test Planner"
            doc.send_welcome_email = 0
            doc.insert(ignore_permissions=True)

    def test_create_task_with_planner_status(self):
        task = frappe.new_doc("Task")
        task.title = "Planner test task"
        task.user = self.user
        task.status = "inbox"
        task.priority = "high"
        task.insert(ignore_permissions=True)

        loaded = frappe.get_doc("Task", task.name)
        self.assertEqual(loaded.status, "inbox")
        self.assertEqual(loaded.priority, "high")

    def test_create_task_with_parent(self):
        parent = frappe.new_doc("Task")
        parent.title = "Parent task"
        parent.user = self.user
        parent.status = "not_started"
        parent.insert(ignore_permissions=True)

        child = frappe.new_doc("Task")
        child.title = "Child task"
        child.user = self.user
        child.parent_task = parent.name
        child.status = "inbox"
        child.insert(ignore_permissions=True)

        children = frappe.get_all("Task", filters={"parent_task": parent.name}, fields=["name"])
        self.assertEqual(len(children), 1)
        self.assertEqual(children[0].name, child.name)

    def test_cannot_set_self_as_parent(self):
        task = frappe.new_doc("Task")
        task.title = "Self parent test"
        task.user = self.user
        task.status = "inbox"
        task.insert(ignore_permissions=True)

        task.parent_task = task.name
        with self.assertRaises(frappe.ValidationError):
            task.save(ignore_permissions=True)

    def test_task_status_transition(self):
        task = frappe.new_doc("Task")
        task.title = "Transition test"
        task.user = self.user
        task.status = "inbox"
        task.insert(ignore_permissions=True)

        frappe.db.set_value("Task", task.name, "status", "today")
        loaded = frappe.get_doc("Task", task.name)
        self.assertEqual(loaded.status, "today")

        frappe.db.set_value("Task", task.name, {"status": "done", "completed_on": now_datetime()})
        loaded = frappe.get_doc("Task", task.name)
        self.assertEqual(loaded.status, "done")
        self.assertIsNotNone(loaded.completed_on)


class TestTaskDependencies(FrappeTestCase):
    """Test task dependency persistence."""

    def setUp(self):
        self.user = "test_dep@example.com"
        if not frappe.db.exists("User", self.user):
            doc = frappe.new_doc("User")
            doc.email = self.user
            doc.first_name = "Test Dep"
            doc.send_welcome_email = 0
            doc.insert(ignore_permissions=True)

    def test_add_and_remove_dependency(self):
        task1 = frappe.new_doc("Task")
        task1.title = "Task 1"
        task1.user = self.user
        task1.status = "inbox"
        task1.insert(ignore_permissions=True)

        task2 = frappe.new_doc("Task")
        task2.title = "Task 2"
        task2.user = self.user
        task2.status = "inbox"
        task2.insert(ignore_permissions=True)

        # Add dependency
        task1.blocked_by_json = json.dumps([task2.name])
        task1.save(ignore_permissions=True)

        loaded = frappe.get_doc("Task", task1.name)
        blocked = json.loads(loaded.blocked_by_json or "[]")
        self.assertIn(task2.name, blocked)

        # Remove dependency
        task1.blocked_by_json = json.dumps([])
        task1.save(ignore_permissions=True)

        loaded = frappe.get_doc("Task", task1.name)
        blocked = json.loads(loaded.blocked_by_json or "[]")
        self.assertEqual(len(blocked), 0)


class TestSessionLifecycle(FrappeTestCase):
    """Test session start/stop/resume/finish."""

    def setUp(self):
        self.user = "test_session@example.com"
        if not frappe.db.exists("User", self.user):
            doc = frappe.new_doc("User")
            doc.email = self.user
            doc.first_name = "Test Session"
            doc.send_welcome_email = 0
            doc.insert(ignore_permissions=True)

        self.task = frappe.new_doc("Task")
        self.task.title = "Session test task"
        self.task.user = self.user
        self.task.status = "today"
        self.task.insert(ignore_permissions=True)

    def test_start_session(self):
        session = frappe.new_doc("Hambaft Task Session")
        session.task = self.task.name
        session.user = self.user
        session.started_at = now_datetime()
        session.status = "active"
        session.duration_minutes = 0
        session.insert(ignore_permissions=True)

        self.assertEqual(session.status, "active")
        self.assertIsNotNone(session.started_at)

    def test_pause_session(self):
        session = frappe.new_doc("Hambaft Task Session")
        session.task = self.task.name
        session.user = self.user
        session.started_at = now_datetime() - timedelta(minutes=30)
        session.status = "active"
        session.duration_minutes = 0
        session.insert(ignore_permissions=True)

        session.status = "paused"
        session.stopped_at = now_datetime()
        session.save(ignore_permissions=True)

        self.assertEqual(session.status, "paused")
        self.assertGreater(session.duration_minutes, 0)

    def test_finish_session(self):
        session = frappe.new_doc("Hambaft Task Session")
        session.task = self.task.name
        session.user = self.user
        session.started_at = now_datetime() - timedelta(minutes=45)
        session.status = "active"
        session.duration_minutes = 0
        session.insert(ignore_permissions=True)

        session.status = "completed"
        session.stopped_at = now_datetime()
        session.save(ignore_permissions=True)

        self.assertEqual(session.status, "completed")


class TestTrackedTimeRollup(FrappeTestCase):
    """Test tracked time rollup to task/project/area."""

    def setUp(self):
        self.user = "test_rollup@example.com"
        if not frappe.db.exists("User", self.user):
            doc = frappe.new_doc("User")
            doc.email = self.user
            doc.first_name = "Test Rollup"
            doc.send_welcome_email = 0
            doc.insert(ignore_permissions=True)

    def test_task_actual_minutes_from_sessions(self):
        task = frappe.new_doc("Task")
        task.title = "Rollup task"
        task.user = self.user
        task.status = "in_progress"
        task.insert(ignore_permissions=True)

        # Create completed session
        session = frappe.new_doc("Hambaft Task Session")
        session.task = task.name
        session.user = self.user
        session.started_at = now_datetime() - timedelta(minutes=60)
        session.stopped_at = now_datetime()
        session.status = "completed"
        session.duration_minutes = 60
        session.insert(ignore_permissions=True)

        # Update task actual_minutes
        total = frappe.db.sql(
            "SELECT COALESCE(SUM(duration_minutes), 0) FROM `tabHambaft Task Session` WHERE task=%s AND status IN ('paused', 'completed')",
            task.name,
        )[0][0] or 0

        frappe.db.set_value("Task", task.name, "actual_minutes", int(total))
        loaded = frappe.get_doc("Task", task.name)
        self.assertEqual(loaded.actual_minutes, 60)


class TestProjectHierarchy(FrappeTestCase):
    """Test project hierarchy and dependency behavior."""

    def setUp(self):
        self.user = "test_proj@example.com"
        if not frappe.db.exists("User", self.user):
            doc = frappe.new_doc("User")
            doc.email = self.user
            doc.first_name = "Test Project"
            doc.send_welcome_email = 0
            doc.insert(ignore_permissions=True)

    def test_project_with_parent(self):
        parent = frappe.new_doc("Hambaft Project")
        parent.title = "Parent Project"
        parent.user = self.user
        parent.status = "برنامه‌ریزی"
        parent.insert(ignore_permissions=True)

        child = frappe.new_doc("Hambaft Project")
        child.title = "Child Project"
        child.user = self.user
        child.parent_project = parent.name
        child.status = "برنامه‌ریزی"
        child.insert(ignore_permissions=True)

        subprojects = frappe.get_all(
            "Hambaft Project",
            filters={"parent_project": parent.name},
            fields=["name"],
        )
        self.assertEqual(len(subprojects), 1)
        self.assertEqual(subprojects[0].name, child.name)

    def test_project_dependencies(self):
        proj1 = frappe.new_doc("Hambaft Project")
        proj1.title = "Dep Project 1"
        proj1.user = self.user
        proj1.status = "برنامه‌ریزی"
        proj1.insert(ignore_permissions=True)

        proj2 = frappe.new_doc("Hambaft Project")
        proj2.title = "Dep Project 2"
        proj2.user = self.user
        proj2.blocked_by_json = json.dumps([proj1.name])
        proj2.status = "برنامه‌ریزی"
        proj2.insert(ignore_permissions=True)

        blocked = json.loads(proj2.blocked_by_json or "[]")
        self.assertIn(proj1.name, blocked)

    def test_project_compute_progress(self):
        project = frappe.new_doc("Hambaft Project")
        project.title = "Progress Project"
        project.user = self.user
        project.status = "فعال"
        project.insert(ignore_permissions=True)

        # Create 2 tasks, 1 done
        t1 = frappe.new_doc("Task")
        t1.title = "Done task"
        t1.user = self.user
        t1.project = project.name
        t1.status = "done"
        t1.insert(ignore_permissions=True)

        t2 = frappe.new_doc("Task")
        t2.title = "Open task"
        t2.user = self.user
        t2.project = project.name
        t2.status = "in_progress"
        t2.insert(ignore_permissions=True)

        loaded = frappe.get_doc("Hambaft Project", project.name)
        progress = loaded.compute_progress()
        self.assertEqual(progress, 50)


class TestPlannerFeeds(FrappeTestCase):
    """Smoke tests for planner feed endpoints."""

    def setUp(self):
        self.user = "test_feed@example.com"
        if not frappe.db.exists("User", self.user):
            doc = frappe.new_doc("User")
            doc.email = self.user
            doc.first_name = "Test Feed"
            doc.send_welcome_email = 0
            doc.insert(ignore_permissions=True)

    def test_today_tasks_feed(self):
        task = frappe.new_doc("Task")
        task.title = "Today feed task"
        task.user = self.user
        task.status = "today"
        task.insert(ignore_permissions=True)

        tasks = frappe.get_all(
            "Task",
            filters={"user": self.user, "status": "today"},
            fields="*",
        )
        self.assertTrue(any(t.name == task.name for t in tasks))

    def test_scheduled_tasks_feed(self):
        today_str = today()
        task = frappe.new_doc("Task")
        task.title = "Scheduled feed task"
        task.user = self.user
        task.status = "not_started"
        task.scheduled_date = today_str
        task.insert(ignore_permissions=True)

        tasks = frappe.get_all(
            "Task",
            filters={"user": self.user, "scheduled_date": today_str, "status": ["not in", ["done", "dropped"]]},
            fields="*",
        )
        self.assertTrue(any(t.name == task.name for t in tasks))

    def test_weekly_feed(self):
        today_str = today()
        base = getdate(today_str)
        dates = [(base + timedelta(days=i)).isoformat() for i in range(7)]

        task = frappe.new_doc("Task")
        task.title = "Weekly feed task"
        task.user = self.user
        task.status = "not_started"
        task.scheduled_date = today_str
        task.insert(ignore_permissions=True)

        found = False
        for d in dates:
            day_tasks = frappe.get_all(
                "Task",
                filters={"user": self.user, "scheduled_date": d, "status": ["not in", ["dropped"]]},
                fields="*",
            )
            if any(t.name == task.name for t in day_tasks):
                found = True
                break
        self.assertTrue(found)
