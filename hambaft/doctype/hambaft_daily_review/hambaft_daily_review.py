# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, nowdate


class HambaftDailyReview(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.user:
            self.user = frappe.session.user

        if not self.review_date:
            frappe.throw(_("تاریخ مرور الزامی است"))

        # Validate score ranges
        if self.life_score is not None and (self.life_score < 0 or self.life_score > 10):
            frappe.throw(_("امتیاز زندگی باید بین ۰ تا ۱۰ باشد"))
        if self.productivity_score is not None and (self.productivity_score < 0 or self.productivity_score > 10):
            frappe.throw(_("امتیاز بهره‌وری باید بین ۰ تا ۱۰ باشد"))
        if self.health_score is not None and (self.health_score < 0 or self.health_score > 10):
            frappe.throw(_("امتیاز سلامت باید بین ۰ تا ۱۰ باشد"))
        if self.finance_score is not None and (self.finance_score < 0 or self.finance_score > 10):
            frappe.throw(_("امتیاز مالی باید بین ۰ تا ۱۰ باشد"))
        if self.mood_score is not None and (self.mood_score < 1 or self.mood_score > 10):
            frappe.throw(_("حال روحی باید بین ۱ تا ۱۰ باشد"))
        if self.energy_score is not None and (self.energy_score < 1 or self.energy_score > 10):
            frappe.throw(_("انرژی باید بین ۱ تا ۱۰ باشد"))

        # Validate non-negative
        for field, label in [
            ("tasks_completed", "تعداد کارهای انجام‌شده"),
            ("tasks_planned", "تعداد کارهای برنامه‌ریزی‌شده"),
            ("habits_completed", "تعداد عادت‌های انجام‌شده"),
            ("habits_planned", "تعداد عادت‌های برنامه‌ریزی‌شده"),
        ]:
            val = getattr(self, field, None)
            if val is not None and val < 0:
                frappe.throw(_("{0} نمی‌تواند منفی باشد").format(label))

        if self.money_spent is not None and self.money_spent < 0:
            frappe.throw(_("هزینه نمی‌تواند منفی باشد"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False


@frappe.whitelist()
def get_daily_review(date=None):
    """Get today's review for the current user, or a specific date."""
    if not date:
        date = nowdate()

    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    existing = frappe.db.get_value(
        "Hambaft Daily Review",
        {"user": user, "review_date": date},
        "name"
    )
    if not existing:
        return None

    doc = frappe.get_doc("Hambaft Daily Review", existing)
    if not has_permission(doc):
        frappe.throw(_("Not permitted"), frappe.PermissionError)
    return doc.as_dict()


@frappe.whitelist()
def get_daily_reviews(from_date=None, to_date=None, limit=50, offset=0):
    """Get current user's daily reviews within a date range."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    filters = {"user": user}
    if from_date and to_date:
        filters["review_date"] = ["between", [from_date, to_date]]
    elif from_date:
        filters["review_date"] = [">=", from_date]
    elif to_date:
        filters["review_date"] = ["<=", to_date]

    reviews = frappe.get_all(
        "Hambaft Daily Review",
        filters=filters,
        fields="*",
        limit_page_length=frappe.utils.cint(limit),
        start=frappe.utils.cint(offset),
        order_by="review_date desc"
    )

    # Convert date fields to Jalali
    from hambaft.hambaft.utils.jalali import to_jalali_string_persian
    for r in reviews:
        if r.get("review_date"):
            r["jalali_date_display"] = to_jalali_string_persian(r["review_date"])

    return reviews


@frappe.whitelist()
def get_or_create_daily_review(date=None):
    """Get today's review or create a new one if none exists."""
    if not date:
        date = nowdate()

    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    existing = frappe.db.get_value(
        "Hambaft Daily Review",
        {"user": user, "review_date": date},
        "name"
    )
    if existing:
        return frappe.get_doc("Hambaft Daily Review", existing).as_dict()

    doc = frappe.new_doc("Hambaft Daily Review")
    doc.user = user
    doc.review_date = date
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return doc.as_dict()
