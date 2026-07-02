# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {"label": "عنوان", "fieldname": "title", "fieldtype": "Data", "width": 200},
        {"label": "نوع", "fieldname": "entry_type", "fieldtype": "Data", "width": 100},
        {"label": "مبلغ", "fieldname": "amount", "fieldtype": "Currency", "width": 120},
        {"label": "دسته‌بندی", "fieldname": "category", "fieldtype": "Data", "width": 120},
        {"label": "تاریخ", "fieldname": "date", "fieldtype": "Date", "width": 100},
        {"label": "کاربر", "fieldname": "user", "fieldtype": "Link", "options": "User", "width": 150},
    ]


def get_data(filters):
    conditions = ""
    if filters and filters.get("user"):
        conditions = f" AND user = '{filters['user']}'"
    if filters and filters.get("entry_type"):
        conditions += f" AND entry_type = '{filters['entry_type']}'"
    if filters and filters.get("from_date"):
        conditions += f" AND date >= '{filters['from_date']}'"
    if filters and filters.get("to_date"):
        conditions += f" AND date <= '{filters['to_date']}'"

    entries = frappe.db.sql(
        f"""
        SELECT title, entry_type, amount, category, date, user
        FROM `tabHambaft Finance Entry`
        WHERE 1=1 {conditions}
        ORDER BY date DESC
        """,
        as_dict=True,
    )
    return entries
