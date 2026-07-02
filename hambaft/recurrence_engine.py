# -*- coding: utf-8 -*-
"""
Recurrence engine for Hambaft.

Given a Hambaft Recurrence Rule document, computes the next occurrence date
based on frequency, interval, days_of_week, day_of_month, start_date, end_date,
and repeat_until_count.

All date outputs are converted to Jalali (Shamsi) strings.
All messages and labels are in Persian.

Edge cases handled:
- Expired rules (past end_date or reached repeat_until_count)
- Custom frequency logic
- Days-of-week filtering (weekly)
- Day-of-month filtering (monthly)
- Interval > 1 for all frequencies
"""
from __future__ import unicode_literals

import datetime

import frappe
from frappe import _
from frappe.utils import getdate, get_datetime, cint

from hambaft.utils.jalali import to_jalali_string, to_jalali_datetime_string

try:
    import jdatetime
except ImportError:
    jdatetime = None


# Frequency constants (Persian labels matching the DocType select options)
FREQUENCY_DAILY = "روزانه"
FREQUENCY_WEEKLY = "هفتگی"
FREQUENCY_MONTHLY = "ماهانه"
FREQUENCY_YEARLY = "سالانه"
FREQUENCY_CUSTOM = "سفارشی"

VALID_FREQUENCIES = [
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
    FREQUENCY_MONTHLY,
    FREQUENCY_YEARLY,
    FREQUENCY_CUSTOM,
]

# Persian weekday names → Python weekday() (Monday=0, Sunday=6)
PERSIAN_WEEKDAYS = {
    "شنبه": 5,        # Saturday
    "یکشنبه": 6,      # Sunday
    "دوشنبه": 0,      # Monday
    "سه‌شنبه": 1,     # Tuesday
    "چهارشنبه": 2,    # Wednesday
    "پنجشنبه": 3,    # Thursday
    "جمعه": 4,        # Friday
}


class RecurrenceExpiry(Exception):
    """Raised when a recurrence rule has expired (past end_date or reached repeat count)."""
    pass


class RecurrenceError(Exception):
    """Raised for invalid recurrence configurations."""
    pass


def _parse_days_of_week(days_of_week_str):
    """
    Parse a comma-separated Persian weekday string into a set of Python weekday ints.
    Example: "شنبه,یکشنبه" → {5, 6}
    """
    if not days_of_week_str:
        return None

    days = set()
    for day_name in days_of_week_str.split(","):
        day_name = day_name.strip()
        if day_name in PERSIAN_WEEKDAYS:
            days.add(PERSIAN_WEEKDAYS[day_name])
    return days if days else None


def _get_next_month_day(year, month, day):
    """
    Get the given day of the month, capping at the last valid day.
    Returns a date object.
    """
    if month == 12:
        next_year_start = datetime.date(year + 1, 1, 1)
        last_day = (next_year_start - datetime.timedelta(days=1)).day
    else:
        next_month_start = datetime.date(year, month + 1, 1)
        last_day = (next_month_start - datetime.timedelta(days=1)).day

    actual_day = min(day, last_day)
    return datetime.date(year, month, actual_day)


def get_next_occurrence(rule_doc, after_date=None):
    """
    Given a Hambaft Recurrence Rule document, compute the next occurrence date.

    Args:
        rule_doc: A Hambaft Recurrence Rule document (or dict-like with fields:
            frequency, interval, days_of_week, day_of_month, start_date,
            end_date, repeat_until_count, occurrence_count)
        after_date: Compute the next occurrence AFTER this date.
                    Defaults to rule_doc.start_date.

    Returns:
        tuple: (next_date as Gregorian datetime.date, jalali_string as str)

    Raises:
        RecurrenceExpiry: If the rule has expired (past end_date or reached repeat count).
        RecurrenceError: If the rule configuration is invalid.
    """
    frequency = rule_doc.frequency
    interval = cint(rule_doc.interval) or 1
    start_date = getdate(rule_doc.start_date)
    end_date = getdate(rule_doc.end_date) if rule_doc.end_date else None
    repeat_until_count = cint(rule_doc.repeat_until_count) or 0
    occurrence_count = cint(getattr(rule_doc, "occurrence_count", 0)) or 0
    days_of_week = _parse_days_of_week(rule_doc.days_of_week)
    day_of_month = cint(rule_doc.day_of_month) or None

    if frequency not in VALID_FREQUENCIES:
        raise RecurrenceError(_("فرکانس نامعتبر: {0}").format(frequency))

    if after_date is None:
        after_date = start_date
    else:
        after_date = getdate(after_date)

    # Check expiry conditions
    if end_date and after_date > end_date:
        raise RecurrenceExpiry(_("قانون تکرار پایان یافته است (تاریخ پایان: {0})").format(
            to_jalali_string(end_date) if jdatetime else str(end_date)
        ))

    if repeat_until_count > 0 and occurrence_count >= repeat_until_count:
        raise RecurrenceExpiry(_("قانون تکرار به حداکثر تعداد تکرار رسیده است ({0} بار)").format(
            repeat_until_count
        ))

    # Compute next date based on frequency
    if frequency == FREQUENCY_DAILY:
        next_date = _next_daily(after_date, interval, start_date, days_of_week)

    elif frequency == FREQUENCY_WEEKLY:
        next_date = _next_weekly(after_date, interval, start_date, days_of_week)

    elif frequency == FREQUENCY_MONTHLY:
        next_date = _next_monthly(after_date, interval, start_date, day_of_month)

    elif frequency == FREQUENCY_YEARLY:
        next_date = _next_yearly(after_date, interval, start_date)

    elif frequency == FREQUENCY_CUSTOM:
        next_date = _next_custom(after_date, interval, start_date, days_of_week, day_of_month)

    else:
        raise RecurrenceError(_("فرکانس پشتیبانی‌نشده: {0}").format(frequency))

    # Validate against end_date
    if end_date and next_date > end_date:
        raise RecurrenceExpiry(_("تاریخ تکرار بعدی ({0}) پس از تاریخ پایان است").format(
            to_jalali_string(next_date) if jdatetime else str(next_date)
        ))

    jalali_str = to_jalali_string(next_date) if jdatetime else str(next_date)
    return next_date, jalali_str


def _next_daily(after_date, interval, start_date, days_of_week=None):
    """Next occurrence for daily recurrence."""
    next_date = after_date + datetime.timedelta(days=interval)

    if days_of_week:
        candidate = next_date
        for _ in range(14):
            if candidate.weekday() in days_of_week:
                return candidate
            candidate += datetime.timedelta(days=1)

    return next_date


def _next_weekly(after_date, interval, start_date, days_of_week=None):
    """Next occurrence for weekly recurrence."""
    if days_of_week:
        weeks_diff = ((after_date - start_date).days // 7) + interval
        week_start = start_date + datetime.timedelta(weeks=weeks_diff)
        candidate = week_start
        for _ in range(7):
            if candidate.weekday() in days_of_week and candidate >= after_date:
                return candidate
            candidate += datetime.timedelta(days=1)
        week_start += datetime.timedelta(weeks=interval)
        candidate = week_start
        for _ in range(7):
            if candidate.weekday() in days_of_week:
                return candidate
            candidate += datetime.timedelta(days=1)
        return week_start
    else:
        weeks_diff = ((after_date - start_date).days // 7) + interval
        return start_date + datetime.timedelta(weeks=weeks_diff)


def _next_monthly(after_date, interval, start_date, day_of_month=None):
    """Next occurrence for monthly recurrence."""
    target_day = day_of_month or start_date.day
    months_diff = (after_date.year - start_date.year) * 12 + (after_date.month - start_date.month)
    months_diff = ((months_diff // interval) + 1) * interval

    target_year = start_date.year + (start_date.month - 1 + months_diff) // 12
    target_month = (start_date.month - 1 + months_diff) % 12 + 1

    return _get_next_month_day(target_year, target_month, target_day)


def _next_yearly(after_date, interval, start_date):
    """Next occurrence for yearly recurrence."""
    years_diff = (after_date.year - start_date.year)
    next_year = start_date.year + ((years_diff // interval) + 1) * interval
    return _get_next_month_day(next_year, start_date.month, start_date.day)


def _next_custom(after_date, interval, start_date, days_of_week=None, day_of_month=None):
    """Next occurrence for custom frequency."""
    candidate = after_date + datetime.timedelta(days=interval)

    if day_of_month:
        months_diff = (candidate.year - start_date.year) * 12 + (candidate.month - start_date.month)
        target_month_offset = ((months_diff // interval) + 1) * interval
        target_year = start_date.year + (start_date.month - 1 + target_month_offset) // 12
        target_month = (start_date.month - 1 + target_month_offset) % 12 + 1
        candidate = _get_next_month_day(target_year, target_month, day_of_month)

    if days_of_week:
        for _ in range(14):
            if candidate.weekday() in days_of_week and candidate >= after_date:
                return candidate
            candidate += datetime.timedelta(days=1)

    return candidate


def create_next_reminder(current_reminder):
    """
    After a reminder is marked 'ارسال‌شده', automatically create the next reminder
    by calculating the next date from the linked recurrence rule.

    Args:
        current_reminder: A Hambaft Reminder document that was just marked 'ارسال‌شده'.
                         Must have a recurrence_rule field set.

    Returns:
        The newly created Hambaft Reminder document, or None if the recurrence
        rule has expired.

    Raises:
        RecurrenceError: If no recurrence_rule is linked.
    """
    if not current_reminder.recurrence_rule:
        raise RecurrenceError(_("هیچ قانون تکراری به این یادآوری متصل نشده است."))

    rule_doc = frappe.get_doc("Hambaft Recurrence Rule", current_reminder.recurrence_rule)
    after_date = getdate(current_reminder.remind_at) if current_reminder.remind_at else None

    try:
        next_date, jalali_str = get_next_occurrence(rule_doc, after_date=after_date)
    except RecurrenceExpiry as e:
        frappe.log_error(
            message=str(e),
            title=_("پایان قانون تکرار — یادآوری {0}").format(current_reminder.name),
        )
        frappe.msgprint(
            _("قانون تکرار «{0}» پایان یافت. یادآوری جدیدی ایجاد نشد.").format(
                rule_doc.title
            ),
            indicator="orange",
            alert=True,
        )
        return None

    next_reminder = frappe.new_doc("Hambaft Reminder")
    next_reminder.user = current_reminder.user
    next_reminder.title = current_reminder.title
    next_reminder.linked_doctype = current_reminder.linked_doctype
    next_reminder.linked_name = current_reminder.linked_name
    next_reminder.remind_at = datetime.datetime.combine(
        next_date,
        datetime.time(9, 0, 0),
    ) if isinstance(next_date, datetime.date) else next_date
    next_reminder.reminder_type = current_reminder.reminder_type
    next_reminder.status = "در انتظار"
    next_reminder.recurrence_rule = current_reminder.recurrence_rule
    if current_reminder.notes:
        next_reminder.notes = current_reminder.notes

    next_reminder.insert()

    rule_doc.occurrence_count = cint(rule_doc.occurrence_count) + 1
    rule_doc.save(ignore_permissions=True)

    frappe.msgprint(
        _("یادآوری بعدی برای «{0}» در تاریخ {1} ایجاد شد.").format(
            current_reminder.title, jalali_str
        ),
        indicator="green",
        alert=True,
    )

    return next_reminder


@frappe.whitelist()
def mark_reminder_sent_and_create_next(reminder_name):
    """
    API endpoint: Mark a reminder as 'ارسال‌شده' and create the next occurrence.

    Args:
        reminder_name: Name of the Hambaft Reminder document.

    Returns:
        dict with status and next_reminder name if created.
    """
    reminder = frappe.get_doc("Hambaft Reminder", reminder_name)

    if reminder.status == "ارسال‌شده":
        return {
            "status": "already_sent",
            "message": _("این یادآوری قبلاً ارسال شده است."),
        }

    reminder.status = "ارسال‌شده"
    reminder.save(ignore_permissions=True)

    if reminder.recurrence_rule:
        try:
            next_reminder = create_next_reminder(reminder)
            if next_reminder:
                return {
                    "status": "next_created",
                    "next_reminder": next_reminder.name,
                    "message": _("یادآوری بعدی ایجاد شد: {0}").format(next_reminder.name),
                }
            else:
                return {
                    "status": "rule_expired",
                    "message": _("قانون تکرار پایان یافت. یادآوری جدیدی ایجاد نشد."),
                }
        except RecurrenceError as e:
            return {
                "status": "error",
                "message": str(e),
            }
    else:
        return {
            "status": "sent_no_recurrence",
            "message": _("یادآوری ارسال شد (بدون قانون تکرار)."),
        }
