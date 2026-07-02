# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unittest
import frappe


class TestHambaftReminder(unittest.TestCase):
    def test_reminder_creation(self):
        """Test that a reminder can be created with required fields."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "تست یادآوری"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        self.assertEqual(reminder.title, "تست یادآوری")
        self.assertEqual(reminder.status, "در انتظار")
        self.assertEqual(reminder.reminder_type, "داخل برنامه")

    def test_reminder_validation_requires_user(self):
        """Test that user is required."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "بدون کاربر"
        reminder.linked_doctype = "Hambaft Task"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_validation_requires_title(self):
        """Test that title is required."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_validation_requires_linked_doctype(self):
        """Test that linked_doctype is required."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "بدون دسته‌بندی"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_dynamic_link_insert_valid(self):
        """Test inserting a reminder with valid linked_doctype + linked_name combo."""
        # First create a task to link to
        task = frappe.new_doc("Hambaft Task")
        task.title = "Linked Test Task"
        task.user = "Administrator"
        task.insert()

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "یادآوری تسک"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = task.name
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        reminder.insert()
        self.assertEqual(reminder.linked_name, task.name)
        reminder.delete()
        task.delete()

    def test_reminder_dynamic_link_insert_invalid(self):
        """Test that linking to a non-existent doc raises validation error."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "یادآوری نامعتبر"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "NONEXISTENT-99999"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        with self.assertRaises(frappe.ValidationError):
            reminder.insert()

    def test_reminder_with_recurrence_rule(self):
        """Test reminder linked to a recurrence rule."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.name = "test-reminder-rule"
        rule.frequency = "روزانه"
        rule.insert()

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "یادآوری تکراری"
        reminder.linked_doctype = "Hambaft Task"
        reminder.linked_name = "TASK-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "ایمیل"
        reminder.status = "در انتظار"
        reminder.recurrence_rule = rule.name
        self.assertEqual(reminder.recurrence_rule, rule.name)
        rule.delete()

    def test_reminder_default_values(self):
        """Test default values are set correctly."""
        reminder = frappe.new_doc("Hambaft Reminder")
        self.assertEqual(reminder.reminder_type, "داخل برنامه")
        self.assertEqual(reminder.status, "در انتظار")

    def test_reminder_email_type(self):
        """Test email reminder type."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "یادآوری ایمیل"
        reminder.linked_doctype = "Hambaft Goal"
        reminder.linked_name = "GOAL-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "ایمیل"
        reminder.status = "در انتظار"
        self.assertEqual(reminder.reminder_type, "ایمیل")

    def test_reminder_push_notification_type(self):
        """Test push notification reminder type."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.user = "Administrator"
        reminder.title = "یادآوری پوش"
        reminder.linked_doctype = "Hambaft Habit"
        reminder.linked_name = "HABIT-00001"
        reminder.remind_at = "2026-07-01 10:00:00"
        reminder.reminder_type = "پوش نوتیفیکیشن"
        reminder.status = "در انتظار"
        self.assertEqual(reminder.reminder_type, "پوش نوتیفیکیشن")
