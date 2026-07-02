# -*- coding: utf-8 -*-
"""
Unit tests for hambaft.recurrence_engine module.

Covers: daily/weekly/monthly/yearly/custom frequencies,
interval > 1, days_of_week filtering, day_of_month filtering,
end_date expiry, repeat_until_count expiry, Jalali conversion,
and the create_next_reminder helper.
"""
from __future__ import unicode_literals

import datetime
import unittest

import frappe


class MockRuleDoc:
    """Minimal mock of a Hambaft Recurrence Rule document for testing."""

    def __init__(self, **kwargs):
        self.frequency = kwargs.get("frequency", "روزانه")
        self.interval = kwargs.get("interval", 1)
        self.start_date = kwargs.get("start_date", "2026-01-01")
        self.end_date = kwargs.get("end_date", None)
        self.repeat_until_count = kwargs.get("repeat_until_count", 0)
        self.occurrence_count = kwargs.get("occurrence_count", 0)
        self.days_of_week = kwargs.get("days_of_week", None)
        self.day_of_month = kwargs.get("day_of_month", None)
        self.title = kwargs.get("title", "Test Rule")
        self.name = kwargs.get("name", "TEST-RULE-001")
        self.user = kwargs.get("user", "Administrator")


class TestParseDaysOfWeek(unittest.TestCase):
    """Test the _parse_days_of_week helper."""

    def setUp(self):
        from hambaft.recurrence_engine import _parse_days_of_week
        self.parse = _parse_days_of_week

    def test_single_day(self):
        result = self.parse("شنبه")
        self.assertEqual(result, {5})

    def test_multiple_days(self):
        result = self.parse("شنبه,یکشنبه,دوشنبه")
        self.assertEqual(result, {5, 6, 0})

    def test_empty_string(self):
        self.assertIsNone(self.parse(""))

    def test_none(self):
        self.assertIsNone(self.parse(None))

    def test_all_days(self):
        result = self.parse("شنبه,یکشنبه,دوشنبه,سه‌شنبه,چهارشنبه,پنجشنبه,جمعه")
        self.assertEqual(result, {0, 1, 2, 3, 4, 5, 6})


class TestGetNextMonthDay(unittest.TestCase):
    """Test the _get_next_month_day helper."""

    def setUp(self):
        from hambaft.recurrence_engine import _get_next_month_day
        self.get_day = _get_next_month_day

    def test_normal_day(self):
        result = self.get_day(2026, 3, 15)
        self.assertEqual(result, datetime.date(2026, 3, 15))

    def test_day_exceeds_february(self):
        result = self.get_day(2026, 2, 31)
        self.assertEqual(result, datetime.date(2026, 2, 28))

    def test_december_31(self):
        result = self.get_day(2026, 12, 31)
        self.assertEqual(result, datetime.date(2026, 12, 31))


class TestDailyRecurrence(unittest.TestCase):
    """Test daily frequency recurrence logic."""

    def setUp(self):
        from hambaft.recurrence_engine import get_next_occurrence
        self.get_next = get_next_occurrence

    def test_daily_interval_1(self):
        rule = MockRuleDoc(frequency="روزانه", interval=1, start_date="2026-01-01")
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 2))

    def test_daily_interval_3(self):
        rule = MockRuleDoc(frequency="روزانه", interval=3, start_date="2026-01-01")
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 4))

    def test_daily_with_weekday_filter(self):
        rule = MockRuleDoc(
            frequency="روزانه",
            interval=1,
            start_date="2026-01-01",
            days_of_week="شنبه,جمعه"  # Saturday, Friday
        )
        # 2026-01-01 is Thursday (3). Next should be Friday 2026-01-02
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 2))
        self.assertEqual(next_date.weekday(), 4)  # Friday

    def test_daily_end_date_expiry(self):
        rule = MockRuleDoc(
            frequency="روزانه",
            interval=1,
            start_date="2026-01-01",
            end_date="2026-01-05"
        )
        with self.assertRaises(Exception):
            self.get_next(rule, after_date="2026-01-05")

    def test_daily_repeat_count_expiry(self):
        rule = MockRuleDoc(
            frequency="روزانه",
            interval=1,
            start_date="2026-01-01",
            repeat_until_count=3,
            occurrence_count=3
        )
        with self.assertRaises(Exception):
            self.get_next(rule, after_date="2026-01-01")


class TestWeeklyRecurrence(unittest.TestCase):
    """Test weekly frequency recurrence logic."""

    def setUp(self):
        from hambaft.recurrence_engine import get_next_occurrence
        self.get_next = get_next_occurrence

    def test_weekly_interval_1(self):
        rule = MockRuleDoc(frequency="هفتگی", interval=1, start_date="2026-01-01")
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 8))

    def test_weekly_interval_2(self):
        rule = MockRuleDoc(frequency="هفتگی", interval=2, start_date="2026-01-01")
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 15))

    def test_weekly_with_days_of_week(self):
        rule = MockRuleDoc(
            frequency="هفتگی",
            interval=1,
            start_date="2026-01-01",
            days_of_week="شنبه"  # Saturday
        )
        # 2026-01-01 is Thursday. Next Saturday is 2026-01-03
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date.weekday(), 5)  # Saturday

    def test_weekly_end_date_expiry(self):
        rule = MockRuleDoc(
            frequency="هفتگی",
            interval=1,
            start_date="2026-01-01",
            end_date="2026-01-05"
        )
        with self.assertRaises(Exception):
            self.get_next(rule, after_date="2026-01-01")


class TestMonthlyRecurrence(unittest.TestCase):
    """Test monthly frequency recurrence logic."""

    def setUp(self):
        from hambaft.recurrence_engine import get_next_occurrence
        self.get_next = get_next_occurrence

    def test_monthly_interval_1(self):
        rule = MockRuleDoc(frequency="ماهانه", interval=1, start_date="2026-01-15")
        next_date, jalali = self.get_next(rule, after_date="2026-01-15")
        self.assertEqual(next_date, datetime.date(2026, 2, 15))

    def test_monthly_interval_3(self):
        rule = MockRuleDoc(frequency="ماهانه", interval=3, start_date="2026-01-15")
        next_date, jalali = self.get_next(rule, after_date="2026-01-15")
        self.assertEqual(next_date, datetime.date(2026, 4, 15))

    def test_monthly_with_day_of_month(self):
        rule = MockRuleDoc(
            frequency="ماهانه",
            interval=1,
            start_date="2026-01-01",
            day_of_month=10
        )
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date.day, 10)
        self.assertEqual(next_date.month, 2)

    def test_monthly_day_exceeds_february(self):
        rule = MockRuleDoc(
            frequency="ماهانه",
            interval=1,
            start_date="2026-01-31",
            day_of_month=31
        )
        # February has 28 days in 2026
        next_date, jalali = self.get_next(rule, after_date="2026-01-31")
        self.assertEqual(next_date, datetime.date(2026, 2, 28))

    def test_monthly_year_rollover(self):
        rule = MockRuleDoc(frequency="ماهانه", interval=1, start_date="2026-12-15")
        next_date, jalali = self.get_next(rule, after_date="2026-12-15")
        self.assertEqual(next_date, datetime.date(2027, 1, 15))


class TestYearlyRecurrence(unittest.TestCase):
    """Test yearly frequency recurrence logic."""

    def setUp(self):
        from hambaft.recurrence_engine import get_next_occurrence
        self.get_next = get_next_occurrence

    def test_yearly_interval_1(self):
        rule = MockRuleDoc(frequency="سالانه", interval=1, start_date="2026-06-15")
        next_date, jalali = self.get_next(rule, after_date="2026-06-15")
        self.assertEqual(next_date, datetime.date(2027, 6, 15))

    def test_yearly_interval_2(self):
        rule = MockRuleDoc(frequency="سالانه", interval=2, start_date="2026-06-15")
        next_date, jalali = self.get_next(rule, after_date="2026-06-15")
        self.assertEqual(next_date, datetime.date(2028, 6, 15))

    def test_yearly_end_date_expiry(self):
        rule = MockRuleDoc(
            frequency="سالانه",
            interval=1,
            start_date="2026-06-15",
            end_date="2027-01-01"
        )
        with self.assertRaises(Exception):
            self.get_next(rule, after_date="2026-06-15")


class TestCustomRecurrence(unittest.TestCase):
    """Test custom frequency recurrence logic."""

    def setUp(self):
        from hambaft.recurrence_engine import get_next_occurrence
        self.get_next = get_next_occurrence

    def test_custom_basic(self):
        rule = MockRuleDoc(frequency="سفارشی", interval=1, start_date="2026-01-01")
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 2))

    def test_custom_with_day_of_month(self):
        rule = MockRuleDoc(
            frequency="سفارشی",
            interval=1,
            start_date="2026-01-01",
            day_of_month=15
        )
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date.day, 15)

    def test_custom_with_weekday_filter(self):
        rule = MockRuleDoc(
            frequency="سفارشی",
            interval=1,
            start_date="2026-01-01",
            days_of_week="دوشنبه,چهارشنبه"  # Monday, Wednesday
        )
        # 2026-01-01 is Thursday. Next matching: Monday 2026-01-05
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertIn(next_date.weekday(), {0, 2})  # Monday or Wednesday


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error conditions."""

    def setUp(self):
        from hambaft.recurrence_engine import get_next_occurrence, RecurrenceError
        self.get_next = get_next_occurrence
        self.RecurrenceError = RecurrenceError

    def test_invalid_frequency(self):
        rule = MockRuleDoc(frequency="نامعلوم", start_date="2026-01-01")
        with self.assertRaises(Exception):
            self.get_next(rule)

    def test_no_after_date_uses_start(self):
        rule = MockRuleDoc(frequency="روزانه", interval=2, start_date="2026-03-01")
        next_date, jalali = self.get_next(rule)
        self.assertEqual(next_date, datetime.date(2026, 3, 3))

    def test_repeat_until_count_zero_means_unlimited(self):
        rule = MockRuleDoc(
            frequency="روزانه",
            interval=1,
            start_date="2026-01-01",
            repeat_until_count=0,
            occurrence_count=999
        )
        # Should NOT raise — 0 means unlimited
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 2))

    def test_end_date_exactly_on_occurrence(self):
        rule = MockRuleDoc(
            frequency="روزانه",
            interval=1,
            start_date="2026-01-01",
            end_date="2026-01-02"
        )
        # Next occurrence from 01-01 is 01-02, which is exactly end_date — should succeed
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        self.assertEqual(next_date, datetime.date(2026, 1, 2))

    def test_after_date_past_end_date(self):
        rule = MockRuleDoc(
            frequency="روزانه",
            interval=1,
            start_date="2026-01-01",
            end_date="2026-01-10"
        )
        with self.assertRaises(Exception):
            self.get_next(rule, after_date="2026-01-11")


class TestJalaliOutput(unittest.TestCase):
    """Test that Jalali string output is returned correctly."""

    def setUp(self):
        from hambaft.recurrence_engine import get_next_occurrence
        self.get_next = get_next_occurrence

    def test_jalali_string_returned(self):
        rule = MockRuleDoc(frequency="روزانه", interval=1, start_date="2026-01-01")
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        # Should return a string (either Jalali or fallback)
        self.assertIsInstance(jalali, str)
        self.assertTrue(len(jalali) > 0)

    def test_jalali_format(self):
        rule = MockRuleDoc(frequency="روزانه", interval=1, start_date="2026-01-01")
        next_date, jalali = self.get_next(rule, after_date="2026-01-01")
        # Format should be YYYY/MM/DD
        parts = jalali.split("/")
        self.assertEqual(len(parts), 3)


class TestCreateNextReminder(unittest.TestCase):
    """Test the create_next_reminder helper (requires Frappe test environment)."""

    def setUp(self):
        from hambaft.recurrence_engine import create_next_reminder
        self.create_next = create_next_reminder
        self._cleanup()

    def tearDown(self):
        self._cleanup()

    def _cleanup(self):
        # Delete test reminders
        for name in frappe.db.get_list(
            "Hambaft Reminder",
            filters={"title": ["like", "test-%"]},
            pluck="name",
        ):
            doc = frappe.get_doc("Hambaft Reminder", name)
            doc.delete(ignore_permissions=True, ignore_on_trash=True)
        # Delete test rules
        for name in frappe.db.get_list(
            "Hambaft Recurrence Rule",
            filters={"title": ["like", "test-%"]},
            pluck="name",
        ):
            doc = frappe.get_doc("Hambaft Recurrence Rule", name)
            doc.delete(ignore_permissions=True, ignore_on_trash=True)

    def test_create_next_reminder_requires_recurrence_rule(self):
        """Should raise error if no recurrence_rule is set."""
        # Create rule
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-daily-rule"
        rule.user = "Administrator"
        rule.frequency = "روزانه"
        rule.interval = 1
        rule.start_date = "2026-01-01"
        rule.insert(ignore_permissions=True)

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "test-no-rule"
        reminder.user = "Administrator"
        reminder.linked_doctype = "User"
        reminder.linked_name = "Administrator"
        reminder.remind_at = "2026-01-01 09:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "ارسال‌شده"
        reminder.recurrence_rule = None
        reminder.insert(ignore_permissions=True)

        with self.assertRaises(Exception):
            self.create_next(reminder)

        reminder.delete(ignore_permissions=True, ignore_on_trash=True)
        rule.delete(ignore_permissions=True, ignore_on_trash=True)

    def test_create_next_reminder_daily(self):
        """Test creating the next reminder for a daily recurrence."""
        # Create a recurrence rule
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-daily-reminder-rule"
        rule.user = "Administrator"
        rule.frequency = "روزانه"
        rule.interval = 1
        rule.start_date = "2026-01-01"
        rule.insert(ignore_permissions=True)

        # Create a reminder
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "test-daily-reminder"
        reminder.user = "Administrator"
        reminder.linked_doctype = "User"
        reminder.linked_name = "Administrator"
        reminder.remind_at = "2026-01-01 09:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "ارسال‌شده"
        reminder.recurrence_rule = rule.name
        reminder.insert(ignore_permissions=True)

        # Create next reminder
        next_reminder = self.create_next(reminder)

        self.assertIsNotNone(next_reminder)
        self.assertEqual(next_reminder.status, "در انتظار")
        self.assertEqual(next_reminder.recurrence_rule, rule.name)
        from frappe.utils import getdate
        self.assertEqual(getdate(next_reminder.remind_at), datetime.date(2026, 1, 2))

        # Cleanup
        next_reminder.delete(ignore_permissions=True, ignore_on_trash=True)
        reminder.delete(ignore_permissions=True, ignore_on_trash=True)
        rule.delete(ignore_permissions=True, ignore_on_trash=True)

    def test_create_next_reminder_expired_rule(self):
        """Test that None is returned when the rule has expired."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-expired-rule"
        rule.user = "Administrator"
        rule.frequency = "روزانه"
        rule.interval = 1
        rule.start_date = "2026-01-01"
        rule.end_date = "2026-01-01"  # Only one occurrence possible
        rule.insert(ignore_permissions=True)

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "test-expired-reminder"
        reminder.user = "Administrator"
        reminder.linked_doctype = "User"
        reminder.linked_name = "Administrator"
        reminder.remind_at = "2026-01-01 09:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "ارسال‌شده"
        reminder.recurrence_rule = rule.name
        reminder.insert(ignore_permissions=True)

        result = self.create_next(reminder)
        self.assertIsNone(result)

        reminder.delete(ignore_permissions=True, ignore_on_trash=True)
        rule.delete(ignore_permissions=True, ignore_on_trash=True)

    def test_occurrence_count_incremented(self):
        """Test that occurrence_count is incremented on the rule."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-count-rule"
        rule.user = "Administrator"
        rule.frequency = "روزانه"
        rule.interval = 1
        rule.start_date = "2026-01-01"
        rule.insert(ignore_permissions=True)

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "test-count-reminder"
        reminder.user = "Administrator"
        reminder.linked_doctype = "User"
        reminder.linked_name = "Administrator"
        reminder.remind_at = "2026-01-01 09:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "ارسال‌شده"
        reminder.recurrence_rule = rule.name
        reminder.insert(ignore_permissions=True)

        self.create_next(reminder)

        # Reload rule and check count
        rule.reload()
        self.assertEqual(rule.occurrence_count, 1)

        reminder.delete(ignore_permissions=True, ignore_on_trash=True)
        rule.delete(ignore_permissions=True, ignore_on_trash=True)


class TestMarkReminderSentAndCreateNext(unittest.TestCase):
    """Test the mark_reminder_sent_and_create_next API."""

    def setUp(self):
        from hambaft.recurrence_engine import mark_reminder_sent_and_create_next
        self.mark_sent = mark_reminder_sent_and_create_next
        self._cleanup()

    def tearDown(self):
        self._cleanup()

    def _cleanup(self):
        for name in frappe.db.get_list(
            "Hambaft Reminder",
            filters={"title": ["like", "test-api-%"]},
            pluck="name",
        ):
            doc = frappe.get_doc("Hambaft Reminder", name)
            doc.delete(ignore_permissions=True, ignore_on_trash=True)
        for name in frappe.db.get_list(
            "Hambaft Recurrence Rule",
            filters={"title": ["like", "test-api-%"]},
            pluck="name",
        ):
            doc = frappe.get_doc("Hambaft Recurrence Rule", name)
            doc.delete(ignore_permissions=True, ignore_on_trash=True)

    def test_mark_sent_creates_next(self):
        """Marking a sent reminder with recurrence should create the next one."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-api-rule"
        rule.user = "Administrator"
        rule.frequency = "روزانه"
        rule.interval = 1
        rule.start_date = "2026-01-01"
        rule.insert(ignore_permissions=True)

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "test-api-reminder"
        reminder.user = "Administrator"
        reminder.linked_doctype = "User"
        reminder.linked_name = "Administrator"
        reminder.remind_at = "2026-01-01 09:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        reminder.recurrence_rule = rule.name
        reminder.insert(ignore_permissions=True)

        result = self.mark_sent(reminder.name)
        self.assertEqual(result["status"], "next_created")
        self.assertIn("next_reminder", result)

    def test_mark_sent_no_recurrence(self):
        """Marking a sent reminder without recurrence returns sent_no_recurrence."""
        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "test-api-no-recur"
        reminder.user = "Administrator"
        reminder.linked_doctype = "User"
        reminder.linked_name = "Administrator"
        reminder.remind_at = "2026-01-01 09:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "در انتظار"
        reminder.recurrence_rule = None
        reminder.insert(ignore_permissions=True)

        result = self.mark_sent(reminder.name)
        self.assertEqual(result["status"], "sent_no_recurrence")

    def test_mark_sent_already_sent(self):
        """Calling on an already-sent reminder returns already_sent."""
        rule = frappe.new_doc("Hambaft Recurrence Rule")
        rule.title = "test-api-already"
        rule.user = "Administrator"
        rule.frequency = "روزانه"
        rule.interval = 1
        rule.start_date = "2026-01-01"
        rule.insert(ignore_permissions=True)

        reminder = frappe.new_doc("Hambaft Reminder")
        reminder.title = "test-api-already"
        reminder.user = "Administrator"
        reminder.linked_doctype = "User"
        reminder.linked_name = "Administrator"
        reminder.remind_at = "2026-01-01 09:00:00"
        reminder.reminder_type = "داخل برنامه"
        reminder.status = "ارسال‌شده"
        reminder.recurrence_rule = rule.name
        reminder.insert(ignore_permissions=True)

        result = self.mark_sent(reminder.name)
        self.assertEqual(result["status"], "already_sent")


if __name__ == "__main__":
    unittest.main()
