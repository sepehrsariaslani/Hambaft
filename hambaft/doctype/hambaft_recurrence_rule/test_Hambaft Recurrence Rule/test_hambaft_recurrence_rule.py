# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unittest
import frappe


class TestHambaftRecurrenceRule(unittest.TestCase):
    def test_recurrence_rule_creation(self):
        """Test that a recurrence rule can be created with required fields."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.name = "test-daily-rule"
        rule.frequency = "\u0631\u0648\u0632\u0627\u0646\u0647"
        rule.interval = 1
        rule.insert()
        self.assertEqual(rule.name, "test-daily-rule")
        self.assertEqual(rule.frequency, "\u0631\u0648\u0632\u0627\u0646\u0647")
        self.assertTrue(rule.is_active)
        rule.delete()

    def test_recurrence_rule_weekly(self):
        """Test weekly recurrence rule."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.name = "test-weekly-rule"
        rule.frequency = "\u0647\u0641\u062a\u06af\u06cc"
        rule.interval = 7
        rule.insert()
        self.assertEqual(rule.frequency, "\u0647\u0641\u062a\u06af\u06cc")
        rule.delete()

    def test_recurrence_rule_validation(self):
        """Test that name is required."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.frequency = "\u0631\u0648\u0632\u0627\u0646\u0647"
        with self.assertRaises(frappe.ValidationError):
            rule.insert()
