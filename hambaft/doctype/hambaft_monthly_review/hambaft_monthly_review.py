# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, cint

JALALI_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر",
    "مرداد", "شهریور", "مهر", "آبان",
    "آذر", "دی", "بهمن", "اسفند"
]


def _month_name_to_number(month_name):
    """Convert Persian month name to month number (1-12)."""
    if month_name in JALALI_MONTHS:
        return JALALI_MONTHS.index(month_name) + 1
    return None


class HambaftMonthlyReview(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.user:
            self.user = frappe.session.user

        # Validate jalali_year is reasonable
        if self.jalali_year and (self.jalali_year < 1300 or self.jalali_year > 1500):
            frappe.throw(_("سال جلالی باید بین ۱۳۰۰ تا ۱۵۰۰ باشد"))

        # Validate jalali_month is a valid month name
        if self.jalali_month and self.jalali_month not in JALALI_MONTHS:
            frappe.throw(_("ماه جلالی نامعتبر است"))

        # Validate month_start <= month_end
        if self.month_start and self.month_end:
            if getdate(self.month_start) > getdate(self.month_end):
                frappe.throw(_("شروع ماه نمی‌تواند بعد از پایان ماه باشد"))

        # Validate overall_score range (0-10)
        if self.overall_score is not None and (self.overall_score < 0 or self.overall_score > 10):
            frappe.throw(_("امتیاز کلی باید بین ۰ تا ۱۰ باشد"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False


@frappe.whitelist()
def get_monthly_review(name=None, jalali_year=None, jalali_month=None):
    """Get a single monthly review by name or by year+month."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    if name:
        doc = frappe.get_doc("Hambaft Monthly Review", name)
        if not has_permission(doc):
            frappe.throw(_("Not permitted"), frappe.PermissionError)
        result = doc.as_dict()
        if result.get("jalali_month") and result.get("jalali_year"):
            result["jalali_month_display"] = "{0} {1}".format(
                result["jalali_month"], result["jalali_year"]
            )
        return result

    if jalali_year and jalali_month:
        existing = frappe.db.get_value(
            "Hambaft Monthly Review",
            {"user": user, "jalali_year": cint(jalali_year), "jalali_month": jalali_month},
            "name"
        )
        if not existing:
            return None
        doc = frappe.get_doc("Hambaft Monthly Review", existing)
        if not has_permission(doc):
            frappe.throw(_("Not permitted"), frappe.PermissionError)
        return doc.as_dict()

    return None


@frappe.whitelist()
def get_monthly_reviews(jalali_year=None, jalali_month=None, limit=20, offset=0):
    """Get current user's monthly reviews."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    filters = {"user": user}
    if jalali_year:
        filters["jalali_year"] = cint(jalali_year)
    if jalali_month:
        filters["jalali_month"] = jalali_month

    reviews = frappe.get_all(
        "Hambaft Monthly Review",
        filters=filters,
        fields="*",
        limit_page_length=cint(limit) if isinstance(limit, int) else 20,
        start=cint(offset) if isinstance(offset, int) else 0,
        order_by="month_start desc"
    )

    # Add Jalali display
    for r in reviews:
        if r.get("jalali_month") and r.get("jalali_year"):
            r["jalali_month_display"] = "{0} {1}".format(r["jalali_month"], r["jalali_year"])

    return reviews


@frappe.whitelist()
def get_or_create_monthly_review(jalali_year, jalali_month):
    """Get or create a monthly review for the current user."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    jalali_year = cint(jalali_year)

    existing = frappe.db.get_value(
        "Hambaft Monthly Review",
        {"user": user, "jalali_year": jalali_year, "jalali_month": jalali_month},
        "name"
    )
    if existing:
        return frappe.get_doc("Hambaft Monthly Review", existing).as_dict()

    # Convert month name to number
    month_num = _month_name_to_number(jalali_month)
    if not month_num:
        frappe.throw(_("ماه جلالی نامعتبر است"))

    # Auto-calculate month_start and month_end from Jalali year/month
    from hambaft.hambaft.utils.jalali import get_jalali_month_start_end
    month_start, month_end = get_jalali_month_start_end(jalali_year, month_num)

    doc = frappe.new_doc("Hambaft Monthly Review")
    doc.user = user
    doc.jalali_year = jalali_year
    doc.jalali_month = jalali_month
    doc.month_start = month_start
    doc.month_end = month_end
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return doc.as_dict()
