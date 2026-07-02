# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unittest
import frappe


class TestHambaftTask(unittest.TestCase):
    def test_task_creation(self):
        """Test that a task can be created with required fields."""
        task = frappe.new_doc("Hambaft Task")
        task.title = "Test Task"
        task.status = "انجام‌نشده"
        task.user = "Administrator"
        self.assertEqual(task.title, "Test Task")

    def test_task_validation_requires_title(self):
        """Test that title is required."""
        task = frappe.new_doc("Hambaft Task")
        task.user = "Administrator"
        with self.assertRaises(frappe.ValidationError):
            task.insert()


class TestHambaftHabit(unittest.TestCase):
    def test_habit_creation(self):
        """Test that a habit can be created."""
        habit = frappe.new_doc("Hambaft Habit")
        habit.title = "Test Habit"
        habit.frequency = "روزانه"
        habit.user = "Administrator"
        self.assertEqual(habit.title, "Test Habit")


class TestHambaftGoal(unittest.TestCase):
    def test_goal_creation(self):
        """Test that a goal can be created."""
        goal = frappe.new_doc("Hambaft Goal")
        goal.title = "Test Goal"
        goal.category = "شخصی"
        goal.user = "Administrator"
        self.assertEqual(goal.title, "Test Goal")


class TestHambaftNote(unittest.TestCase):
    def test_note_creation(self):
        """Test that a note can be created."""
        note = frappe.new_doc("Hambaft Note")
        note.title = "Test Note"
        note.content = "Test content"
        note.user = "Administrator"
        self.assertEqual(note.title, "Test Note")


class TestHambaftFinanceEntry(unittest.TestCase):
    def test_finance_entry_creation(self):
        """Test that a finance entry can be created."""
        entry = frappe.new_doc("Hambaft Finance Entry")
        entry.title = "Test Entry"
        entry.entry_type = "هزینه"
        entry.amount = 100000
        entry.user = "Administrator"
        self.assertEqual(entry.amount, 100000)
