# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe.model.document import Document
from frappe import _


class HambaftReminder(Document):
    def validate(self):
        """Server-side validation for Dynamic Link auto-linking.

        - When linked_doctype changes, reset linked_name to prevent stale references.
        - Validate that linked_name exists in linked_doctype.
        """
        # Auto-linking: reset linked_name when linked_doctype changes
        if self.has_value_changed("linked_doctype") and self.linked_name:
            self.linked_name = None
            frappe.msgprint(
                _("مورد مرتبط پاک شد — لطفاً با توجه به دسته‌بندی جدید انتخاب کنید"),
                indicator="blue",
                alert=True,
            )

        # Validate that linked_name exists in the target doctype
        if self.linked_doctype and self.linked_name:
            if not frappe.db.exists(self.linked_doctype, self.linked_name):
                frappe.throw(
                    _("مورد {0} در دسته‌بندی {1} یافت نشد").format(
                        frappe.bold(self.linked_name),
                        frappe.bold(self.linked_doctype),
                    )
                )

    def before_save(self):
        """Legacy safety net — validate linked_name before saving."""
        if self.linked_doctype and self.linked_name:
            if not frappe.db.exists(self.linked_doctype, self.linked_name):
                frappe.throw(
                    _("مورد {0} در دسته‌بندی {1} یافت نشد").format(
                        self.linked_name, self.linked_doctype
                    )
                )

    def on_update(self):
        """Post-save hook: auto-create next reminder when sent."""
        if self.has_value_changed("status") and self.status == "ارسال‌شده":
            if self.recurrence_rule:
                from hambaft.recurrence_engine import create_next_reminder
                try:
                    create_next_reminder(self)
                except Exception as e:
                    frappe.log_error(
                        message=str(e),
                        title=_("خطا در ایجاد یادآوری بعدی — {0}").format(self.name),
                    )

        if self.has_value_changed("linked_doctype"):
            # Reset linked_name if doctype changed to maintain integrity
            if self.linked_name:
                self.linked_name = None


def has_permission(doc, ptype="read", user=None):
    """Permission check: owner can manage, others read-only."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False


@frappe.whitelist()
def get_linked_doctypes():
    """Return list of doctypes that can be linked to a reminder.

    Used by frontend for quick creation buttons.
    """
    return [
        "Hambaft Task",
        "Hambaft Goal",
        "Hambaft Habit",
        "Hambaft Note",
        "Hambaft Finance Entry",
        "Hambaft AI Task",
        "Supplement Reminder",
    ]
