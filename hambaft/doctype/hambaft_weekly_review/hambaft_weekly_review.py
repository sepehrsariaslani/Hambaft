# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, nowdate, today, cint
from datetime import timedelta


class HambaftWeeklyReview(Document):
    def before_insert(self):
        if not self.user:
            self.user = frappe.session.user
        # Auto-calculate week_end from week_start if not set
        if self.week_start and not self.week_end:
            self.week_end = getdate(self.week_start) + timedelta(days=6)

    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        # Auto-calculate week_end from week_start if not set
        if self.week_start and not self.week_end:
            self.week_end = getdate(self.week_start) + timedelta(days=6)

    def validate(self):
        if not self.user:
            self.user = frappe.session.user

        if not self.week_start:
            frappe.throw(_("شروع هفته الزامی است"))

        if self.week_start and self.week_end:
            if getdate(self.week_start) > getdate(self.week_end):
                frappe.throw(_("شروع هفته نمی‌تواند بعد از پایان هفته باشد"))

        # Enforce uniqueness: one review per user per week_start
        existing = frappe.db.exists(
            "Hambaft Weekly Review",
            {"user": self.user, "week_start": self.week_start, "name": ["!=", self.name]},
        )
        if existing:
            frappe.throw(
                _("مرور هفتگی برای این کاربر در این هفته از قبل وجود دارد: {0}").format(existing)
            )

        # Validate overall_score range (0-10)
        if self.overall_score is not None and (self.overall_score < 0 or self.overall_score > 10):
            frappe.throw(_("امتیاز کلی باید بین ۰ و ۱۰ باشد"))

        # Validate non-negative task counts
        if self.completed_tasks is not None and self.completed_tasks < 0:
            frappe.throw(_("تعداد کارهای انجام‌شده نمی‌تواند منفی باشد"))
        if self.missed_tasks is not None and self.missed_tasks < 0:
            frappe.throw(_("تعداد کارهای انجام‌نشده نمی‌تواند منفی باشد"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False


@frappe.whitelist()
def get_weekly_review(week_start=None):
    """Get the current user's weekly review for a given week start date."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    if not week_start:
        from hambaft.hambaft.utils.jalali import get_current_jalali_week_start
        week_start = get_current_jalali_week_start()

    existing = frappe.db.get_value(
        "Hambaft Weekly Review",
        {"user": user, "week_start": week_start},
        "name"
    )
    if not existing:
        return None

    doc = frappe.get_doc("Hambaft Weekly Review", existing)
    if not has_permission(doc):
        frappe.throw(_("Not permitted"), frappe.PermissionError)
    return doc.as_dict()


@frappe.whitelist()
def get_weekly_reviews(limit=10, offset=0):
    """Get current user's weekly reviews."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    reviews = frappe.get_all(
        "Hambaft Weekly Review",
        filters={"user": user},
        fields="*",
        limit_page_length=cint(limit),
        start=cint(offset),
        order_by="week_start desc"
    )

    # Convert date fields to Jalali
    from hambaft.hambaft.utils.jalali import to_jalali_string_persian
    for r in reviews:
        if r.get("week_start") and r.get("week_end"):
            r["jalali_week_display"] = (
                to_jalali_string_persian(r["week_start"]) + " — " +
                to_jalali_string_persian(r["week_end"])
            )

    return reviews


@frappe.whitelist()
def get_or_create_weekly_review(week_start=None):
    """Get or create a weekly review for the current user."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    if not week_start:
        from hambaft.hambaft.utils.jalali import get_current_jalali_week_start
        week_start = get_current_jalali_week_start()

    existing = frappe.db.get_value(
        "Hambaft Weekly Review",
        {"user": user, "week_start": week_start},
        "name"
    )
    if existing:
        return frappe.get_doc("Hambaft Weekly Review", existing).as_dict()

    doc = frappe.new_doc("Hambaft Weekly Review")
    doc.user = user
    doc.week_start = week_start
    doc.week_end = getdate(week_start) + timedelta(days=6)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return doc.as_dict()
