# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unittest
import frappe


class TestHambaftReminder(unittest.TestCase):
    def test_reminder_creation(self):
        """Test that a reminder can be created with required fields."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "\u062a\u0633\u062a \u06cc\u0627\u062f\u0622\u0648\u0631\u06cc"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        self.assertEqual(reminder.title, "\u062a\u0633\u062a \u06cc\u0627\u062f\u0622\u0648\u0631\u06cc")
        self.assertEqual(reminder.status, "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631")
        self.assertEqual(reminder.reminder_type, "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647")

    def test_reminder_validation_requires_user(self):
        """Test that user is required."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "\u0628\u062f\u0648\u0646 \u06a9\u0627\u0631\u0628\u0631"
        reminder.linked_doctype = "Hambaft Task"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_validation_requires_title(self):
        """Test that title is required."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_validation_requires_linked_doctype(self):
        """Test that linked_doctype is required for dynamic link."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "\u0628\u062f\u0648\u0646 \u062f\u0633\u062a\u0647\u200c\u0628\u0646\u062f\u06cc"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_dynamic_link_valid(self):
        """Test linking to an existing document."""
        task = frappe.new_doc("Hambaft Task")
        task.title = "Linked Test Task"
        task.user = "Administrator"
        task.insert()

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "\u06cc\u0627\u062f\u0622\u0648\u0631\u06cc \u062a\u0633\u06a9"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = task.name
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        reminder.insert()
        self.assertEqual(reminder.linked_name, task.name)
        reminder.delete()
        task.delete()

    def test_reminder_dynamic_link_invalid(self):
        """Test that linking to non-existent doc raises error."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "\u06cc\u0627\u062f\u0622\u0648\u0631\u06cc \u0646\u0627\u0645\u0639\u062a\u0628\u0631"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "NONEXISTENT-99999"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_with_recurrence_rule(self):
        """Test reminder linked to a recurrence rule."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.name = "test-reminder-rule"
        rule.frequency = "\u0631\u0648\u0632\u0627\u0646\u0647"
        rule.insert()

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "\u06cc\u0627\u062f\u0622\u0648\u0631\u06cc \u062a\u06a9\u0631\u0627\u0631\u06cc"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u0627\u06cc\u0645\u06cc\u0644"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        reminder.recurrence_rule = rule.name
        self.assertEqual(reminder.recurrence_rule, rule.name)
        rule.delete()

    def test_reminder_default_values(self):
        """Test that defaults are set correctly."""
        reminder = frappe.new_doc("Hambaft Reminder")
        self.assertEqual(reminder.reminder_type, "\u062f\u0627\u062e\u0644 \u0628\u0631\u0646\u0627\u0645\u0647")
        self.assertEqual(reminder.status, "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631")

    def test_reminder_email_type(self):
        """Test email reminder type."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "\u06cc\u0627\u062f\u0622\u0648\u0631\u06cc \u0627\u06cc\u0645\u06cc\u0644"
        reminder.linked_doctype = "Hambaft Goal"
        reminder.linked_name = "GOAL-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u0627\u06cc\u0645\u06cc\u0644"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        self.assertEqual(reminder.reminder_type, "\u0627\u06cc\u0645\u06cc\u0644")

    def test_reminder_push_notification_type(self):
        """Test push notification reminder type."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "\u06cc\u0627\u062f\u0622\u0648\u0631\u06cc \u067e\u0648\u0634"
        reminder.linked_doctype = "Hambaft Habit"
        reminder.linked_name = "HABIT-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "\u067e\u0648\u0634 \u0646\u0648\u062a\u06cc\u0641\u06cc\u06a9\u06cc\u0634\u0646"
        reminder.status = "\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631"
        self.assertEqual(reminder.reminder_type, "\u067e\u0648\u0634 \u0646\u0648\u062a\u06cc\u0641\u06cc\u06a9\u06cc\u0634\u0646")

    def test_get_linked_doctypes(self):
        """Test the whitelist API returns valid doctypes."""
        from hambaft.hambaft.doctype.hambaft_reminder.hambaft_reminder import get_linked_doctypes
        doctypes = get_linked_doctypes()
        self.assertIn("Hambaft Task", doctypes)
        self.assertIn("Hambaft Goal", doctypes)
        self.assertIsInstance(doctypes, list)
