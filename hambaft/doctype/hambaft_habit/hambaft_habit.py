# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftHabit(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.habit_name:
            frappe.throw(_("نام عادت الزامی است"))

        # Auto-set user
        if not self.user:
            self.user = frappe.session.user

        # If schedule_type is "هر روز", auto-populate all 7 days
        if self.schedule_type == "هر روز" and not self.schedule:
            days = ["دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه", "یکشنبه"]
            for day in days:
                self.append("schedule", {
                    "day_of_week": day,
                    "is_active": 1
                })

        # Validate target_value is set for numeric habit types
        if self.habit_type in ["عددی", "مدت‌زمان", "آب", "خواب", "مکمل", "ورزش", "مطالعه", "مالی"]:
            if not self.target_value or self.target_value <= 0:
                frappe.throw(_("مقدار هدف باید بیشتر از صفر باشد"))

        # Reminder time required if reminder is enabled
        if self.reminder_enabled and not self.reminder_time:
            frappe.throw(_("زمان یادآوری را مشخص کنید"))


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
