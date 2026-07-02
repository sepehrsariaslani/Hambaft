# -*- coding: utf-8 -*-
"""
Jalali (Shamsi / Persian Solar Hijri) date utilities for Hambaft.

Uses jdatetime for all calendar conversion math.
All dates are stored in Gregorian (ISO 8601) in the database.
This module provides conversion for API responses and display.
"""
from __future__ import unicode_literals

import datetime

import frappe
from frappe.utils import getdate, get_datetime, cint

try:
    import jdatetime
except ImportError:
    jdatetime = None


# Persian month names (1-indexed in usage)
PERSIAN_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر",
    "مرداد", "شهریور", "مهر", "آبان",
    "آذر", "دی", "بهمن", "اسفند"
]

# Persian digit mapping
_PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
_LATIN_DIGITS = "0123456789"
_LATIN_TO_PERSIAN = str.maketrans(_LATIN_DIGITS, _PERSIAN_DIGITS)
_PERSIAN_TO_LATIN = str.maketrans(_PERSIAN_DIGITS, _LATIN_DIGITS)


def to_persian_digits(text):
    """Replace Latin digits (0-9) with Persian digits (۰-۹)."""
    return str(text).translate(_LATIN_TO_PERSIAN)


def _from_persian_digits(text):
    """Replace Persian digits (۰-۹) with Latin digits (0-9)."""
    return str(text).translate(_PERSIAN_TO_LATIN)


def _ensure_jdatetime():
    """Raise an error if jdatetime is not installed."""
    if jdatetime is None:
        frappe.throw(
            "jdatetime package is required for Jalali date conversion. "
            "Install it with: pip install jdatetime"
        )


def to_jalali_string(date_obj):
    """
    Convert a Python date/datetime/string to a Jalali date string.
    Output: "1405/03/15" (Latin digits)
    """
    _ensure_jdatetime()

    if date_obj is None:
        return None

    if isinstance(date_obj, str):
        if not date_obj:
            return None
        date_obj = getdate(date_obj)

    if isinstance(date_obj, datetime.datetime):
        date_obj = date_obj.date()

    jalali = jdatetime.date.fromgregorian(date=date_obj)
    return "{:04d}/{:02d}/{:02d}".format(jalali.year, jalali.month, jalali.day)


def to_jalali_string_persian(date_obj):
    """
    Convert a Python date/datetime/string to a Jalali date string with Persian digits.
    Output: "۱۴۰۵/۰۳/۱۵" (Persian digits)
    """
    result = to_jalali_string(date_obj)
    return to_persian_digits(result) if result else None


def to_jalali_datetime_string(dt_obj):
    """
    Convert a Python datetime/string to a Jalali datetime string.
    Output: "1405/03/15 ساعت 14:30"
    """
    _ensure_jdatetime()

    if dt_obj is None:
        return None

    if isinstance(dt_obj, str):
        if not dt_obj:
            return None
        dt_obj = get_datetime(dt_obj)

    if isinstance(dt_obj, datetime.date) and not isinstance(dt_obj, datetime.datetime):
        return to_jalali_string(dt_obj)

    jalali = jdatetime.datetime.fromgregorian(datetime=dt_obj)
    return "{:04d}/{:02d}/{:02d} ساعت {:02d}:{:02d}".format(
        jalali.year, jalali.month, jalali.day,
        jalali.hour, jalali.minute
    )


def to_jalali_datetime_string_persian(dt_obj):
    """
    Convert a Python datetime/string to a Jalali datetime string with Persian digits.
    Output: "۱۴۰۵/۰۳/۱۵ ساعت ۱۴:۳۰"
    """
    result = to_jalali_datetime_string(dt_obj)
    return to_persian_digits(result) if result else None


def to_gregorian_date(jalali_string):
    """
    Convert a Jalali date string (e.g. "1405/03/15" or "۱۴۰۵/۰۳/۱۵")
    back to a Python datetime.date for database writes.
    """
    _ensure_jdatetime()

    if not jalali_string:
        return None

    normalized = _from_persian_digits(str(jalali_string))

    parts = normalized.split("/")
    if len(parts) != 3:
        frappe.throw("Invalid Jalali date format: {}. Expected YYYY/MM/DD.".format(jalali_string))

    try:
        jy, jm, jd = int(parts[0]), int(parts[1]), int(parts[2])
    except (ValueError, IndexError):
        frappe.throw("Invalid Jalali date: {}".format(jalali_string))

    try:
        jalali_date = jdatetime.date(jy, jm, jd)
        return jalali_date.togregorian()
    except ValueError:
        frappe.throw("Invalid Jalali date: {}/{}/{}".format(jy, jm, jd))


def get_jalali_month_name(date_obj):
    """Get the Persian month name for a given date."""
    _ensure_jdatetime()

    if date_obj is None:
        return None

    if isinstance(date_obj, str):
        date_obj = getdate(date_obj)

    if isinstance(date_obj, datetime.datetime):
        date_obj = date_obj.date()

    jalali = jdatetime.date.fromgregorian(date=date_obj)
    if 1 <= jalali.month <= 12:
        return PERSIAN_MONTHS[jalali.month - 1]
    return None


def get_jalali_year(date_obj):
    """Get the Jalali year for a given date."""
    _ensure_jdatetime()

    if date_obj is None:
        return None

    if isinstance(date_obj, str):
        date_obj = getdate(date_obj)

    if isinstance(date_obj, datetime.datetime):
        date_obj = date_obj.date()

    jalali = jdatetime.date.fromgregorian(date=date_obj)
    return jalali.year


def get_jalali_month(date_obj):
    """Get the Jalali month number (1-12) for a given date."""
    _ensure_jdatetime()

    if date_obj is None:
        return None

    if isinstance(date_obj, str):
        date_obj = getdate(date_obj)

    if isinstance(date_obj, datetime.datetime):
        date_obj = date_obj.date()

    jalali = jdatetime.date.fromgregorian(date=date_obj)
    return jalali.month


def get_current_jalali_week_start():
    """
    Get the Saturday (start of Persian week) for the current week.
    Returns a datetime.date object.
    """
    today = getdate()
    # weekday(): Monday=0, Sunday=6
    # Saturday = 5 (when Monday=0)
    days_since_saturday = (today.weekday() - 5) % 7
    return today - datetime.timedelta(days=days_since_saturday)


def get_jalali_month_start_end(jalali_year, jalali_month):
    """
    Given a Jalali year and month (1-12), return the Gregorian
    start and end dates of that month.

    Returns: (month_start_date, month_end_date)
    """
    _ensure_jdatetime()

    jalali_start = jdatetime.date(jalali_year, jalali_month, 1)
    month_start = jalali_start.togregorian()

    if jalali_month < 12:
        jalali_end = jdatetime.date(jalali_year, jalali_month + 1, 1)
        next_month_start = jalali_end.togregorian()
        month_end = next_month_start - datetime.timedelta(days=1)
    else:
        # Esfand (month 12) — check for leap year
        try:
            jalali_end_30 = jdatetime.date(jalali_year, 12, 30)
            month_end = jalali_end_30.togregorian()
        except ValueError:
            jalali_end_29 = jdatetime.date(jalali_year, 12, 29)
            month_end = jalali_end_29.togregorian()

    return month_start, month_end


def convert_doc_dates(doc, date_fields, use_persian_digits=False):
    """
    Given a document dict and a list of date/datetime field names,
    convert all specified fields from Gregorian to Jalali strings.
    """
    if not doc:
        return doc

    for field in date_fields:
        value = doc.get(field) if isinstance(doc, dict) else getattr(doc, field, None)
        if value:
            if use_persian_digits:
                converted = to_jalali_string_persian(value)
            else:
                converted = to_jalali_string(value)
            if isinstance(doc, dict):
                doc[field] = converted
            else:
                setattr(doc, field, converted)

    return doc


def convert_doc_datetimes(doc, datetime_fields, use_persian_digits=False):
    """
    Given a document dict and a list of datetime field names,
    convert all specified datetime fields from Gregorian to Jalali strings.
    """
    if not doc:
        return doc

    for field in datetime_fields:
        value = doc.get(field) if isinstance(doc, dict) else getattr(doc, field, None)
        if value:
            if use_persian_digits:
                converted = to_jalali_datetime_string_persian(value)
            else:
                converted = to_jalali_datetime_string(value)
            if isinstance(doc, dict):
                doc[field] = converted
            else:
                setattr(doc, field, converted)

    return doc
