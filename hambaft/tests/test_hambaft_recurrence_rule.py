# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unittest
import frappe


class TestHambaftRecurrenceRule(unittest.TestCase):
    def test_recurrence_rule_creation(self):
        """Test that a recurrence rule can be created with required fields."""
        doc = frappe.new_doc("Hambaft Recurrence Rule")
        doc.title = "Test Recurrence"
        doc.user = "Administrator"
        doc.frequency = "روزانه"
        doc.start_date = "2026-07-01"
        self.assertEqual(doc.title, "Test Recurrence")
        self.assertEqual(doc.frequency, "روزانه")

    def test_recurrence_rule_full_fields(self):
        """Test creating a recurrence rule with all optional fields."""
        doc = frappe.new_doc("Hambaft Recurrence Rule")
        doc.title = "Weekly Workout"
        doc.user = "Administrator"
        doc.frequency = "هفتگی"
        doc.interval = 2
        doc.days_of_week = "شنبه,یکشنبه"
        doc.day_of_month = 15
        doc.start_date = "2026-07-01"
        doc.end_date = "2026-12-31"
        doc.repeat_until_count = 30
        self.assertEqual(doc.interval, 2)
        self.assertEqual(doc.day_of_month, 15)
        self.assertEqual(doc.repeat_until_count, 30)

    def test_recurrence_rule_validation_requires_title(self):
        """Test that title is required."""
        doc = frappe.new_doc("Hambaft Recurrence Rule")
        doc.user = "Administrator"
        doc.frequency = "روزانه"
        doc.start_date = "2026-07-01"
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_recurrence_rule_validation_requires_start_date(self):
        """Test that start_date is required."""
        doc = frappe.new_doc("Hambaft Recurrence Rule")
        doc.title = "No Start Date"
        doc.user = "Administrator"
        doc.frequency = "روزانه"
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_recurrence_rule_validation_end_before_start(self):
        """Test that end_date cannot be before start_date."""
        doc = frappe.new_doc("Hambaft Recurrence Rule")
        doc.title = "Bad Dates"
        doc.user = "Administrator"
        doc.frequency = "روزانه"
        doc.start_date = "2026-07-01"
        doc.end_date = "2026-06-01"
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_recurrence_rule_defaults(self):
        """Test default values."""
        doc = frappe.new_doc("Hambaft Recurrence Rule")
        doc.title = "Default Test"
        doc.user = "Administrator"
        doc.frequency = "سالانه"
        doc.start_date = "2026-07-01"
        self.assertEqual(doc.interval, 1)
