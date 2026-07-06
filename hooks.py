# -*- coding: utf-8 -*-
from __future__ import unicode_literals

app_name = "hambaft"
app_title = "Hambaft"
app_publisher = "Sepehr"
app_description = "Hambaft — Personal Life Management OS"
app_email = "sepehr.sariaslani@gmail.com"
app_license = "mit"

home_page = "hambaft"

website_route_rules = [
    {"from_route": "/hambaft", "to_route": "hambaft"},
    {"from_route": "/hambaft/<path:app_path>", "to_route": "hambaft"},
]

doc_events = {
    "Goal": {
        "validate": "hambaft.hambaft.doctype.goal.goal.validate",
        "on_update": "hambaft.hambaft.doctype.goal.goal.on_update",
    },
    "Task": {
        "validate": "hambaft.hambaft.doctype.task.task.validate",
        "on_update": "hambaft.hambaft.doctype.task.task.on_update",
    },
    "Habit Log": {
        "on_update": "hambaft.hambaft.doctype.habit_log.habit_log.on_update",
    },
    "Hambaft Finance Account": {
        "validate": "hambaft.hambaft.doctype.hambaft_finance_account.hambaft_finance_account.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_finance_account.hambaft_finance_account.before_save",
        "on_update": "hambaft.hambaft.doctype.hambaft_finance_account.hambaft_finance_account.on_update",
    },
    "Hambaft Finance Category": {
        "validate": "hambaft.hambaft.doctype.hambaft_finance_category.hambaft_finance_category.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_finance_category.hambaft_finance_category.before_save",
    },
    "Hambaft Transaction": {
        "validate": "hambaft.hambaft.doctype.hambaft_transaction.hambaft_transaction.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_transaction.hambaft_transaction.before_save",
        "on_update": "hambaft.hambaft.doctype.hambaft_transaction.hambaft_transaction.on_update",
        "on_cancel": "hambaft.hambaft.doctype.hambaft_transaction.hambaft_transaction.on_cancel",
    },
    "Hambaft Budget": {
        "validate": "hambaft.hambaft.doctype.hambaft_budget.hambaft_budget.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_budget.hambaft_budget.before_save",
    },
    "Hambaft Savings Goal": {
        "validate": "hambaft.hambaft.doctype.hambaft_savings_goal.hambaft_savings_goal.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_savings_goal.hambaft_savings_goal.before_save",
    },
    "Hambaft Bill": {
        "validate": "hambaft.hambaft.doctype.hambaft_bill.hambaft_bill.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_bill.hambaft_bill.before_save",
    },
    "Hambaft Subscription": {
        "validate": "hambaft.hambaft.doctype.hambaft_subscription.hambaft_subscription.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_subscription.hambaft_subscription.before_save",
    },
    "Hambaft Recurrence Rule": {
        "validate": "hambaft.hambaft.doctype.hambaft_recurrence_rule.hambaft_recurrence_rule.validate",
    },
    "Hambaft Daily Review": {
        "validate": "hambaft.hambaft.doctype.hambaft_daily_review.hambaft_daily_review.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_daily_review.hambaft_daily_review.before_save",
    },
    "Hambaft Weekly Review": {
        "validate": "hambaft.hambaft.doctype.hambaft_weekly_review.hambaft_weekly_review.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_weekly_review.hambaft_weekly_review.before_save",
    },
    "Hambaft Monthly Review": {
        "validate": "hambaft.hambaft.doctype.hambaft_monthly_review.hambaft_monthly_review.validate",
        "before_save": "hambaft.hambaft.doctype.hambaft_monthly_review.hambaft_monthly_review.before_save",
    },
}

scheduler_events = {
    "daily": [
        "hambaft.hambaft.api.daily_maintenance",
        "hambaft.hambaft.api.check_overdue_bills",
        "hambaft.hambaft.api.advance_subscription_billing",
    ],
    "hourly": [
        "hambaft.hambaft.api.habit_streak_recalc",
    ],
    "monthly": [
        "hambaft.hambaft.api.generate_recurring_transactions",
    ],
}

fixtures = [
    {"dt": "Role", "filters": [["name", "in", ["Hambaft User", "Hambaft Admin"]]]},
]

override_doctype_class = {
    "Hambaft Recurrence Rule": "hambaft.hambaft.doctype.hambaft_recurrence_rule.hambaft_recurrence_rule.HambaftRecurrenceRule",
}
