# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unittest
import frappe


class TestHambaftRecurrenceRule(unittest.TestCase):
    def setUp(self):
        # Clean up any test records from previous runs
        for name in frappe.db.get_list(
            "Hambaft Recurrence Rule",
            filters={"title": ["like", "test-%"]},
            pluck="name",
        ):
            frappe.delete_doc("Hambaft Recurrence Rule", name, force=True)

    def test_recurrence_rule_creation(self):
        """Test that a recurrence rule can be created with required fields."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-daily-rule"
        rule.user = frappe.session.user
        rule.frequency = "روزانه"
        rule.interval = 1
        rule.start_date = "2026-01-01"
        rule.insert()
        self.assertEqual(rule.frequency, "روزانه")
        self.assertEqual(rule.interval, 1)
        rule.delete()

    def test_recurrence_rule_weekly(self):
        """Test weekly recurrence rule."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-weekly-rule"
        rule.user = frappe.session.user
        rule.frequency = "هفتگی"
        rule.interval = 2
        rule.start_date = "2026-01-01"
        rule.insert()
        self.assertEqual(rule.frequency, "هفتگی")
        self.assertEqual(rule.interval, 2)
        rule.delete()

    def test_recurrence_rule_validation_title_required(self):
        """Test that title is required."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.frequency = "روزانه"
        rule.start_date = "2026-01-01"
        with self.assertRaises(frappe.ValidationError):
            rule.insert()

    def test_recurrence_rule_validation_invalid_frequency(self):
        """Test that invalid frequency is rejected."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-invalid-freq"
        rule.user = frappe.session.user
        rule.frequency = "InvalidOption"
        rule.start_date = "2026-01-01"
        with self.assertRaises(frappe.ValidationError):
            rule.insert()

    def test_recurrence_rule_validation_day_of_month(self):
        """Test that day_of_month must be between 1 and 31."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-invalid-day"
        rule.user = frappe.session.user
        rule.frequency = "ماهانه"
        rule.day_of_month = 35
        rule.start_date = "2026-01-01"
        with self.assertRaises(frappe.ValidationError):
            rule.insert()

    def test_recurrence_rule_validation_end_date_before_start(self):
        """Test that end_date cannot be before start_date."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-bad-dates"
        rule.user = frappe.session.user
        rule.frequency = "روزانه"
        rule.start_date = "2026-06-01"
        rule.end_date = "2026-05-01"
        with self.assertRaises(frappe.ValidationError):
            rule.insert()

    def test_recurrence_rule_validation_interval(self):
        """Test that interval must be at least 1."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-bad-interval"
        rule.user = frappe.session.user
        rule.frequency = "روزانه"
        rule.interval = 0
        rule.start_date = "2026-01-01"
        with self.assertRaises(frappe.ValidationError):
            rule.insert()
