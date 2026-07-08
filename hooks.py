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

# NOTE: validate / before_save / on_update / on_cancel for the doctypes below
# are defined as controller class methods (e.g. Task.validate in
# hambaft/doctype/task/task.py). Frappe runs those automatically on every
# insert/save. Registering them here ALSO — as module-level functions that do
# not exist — made Frappe's hook resolver raise
#   AttributeError: module '...task.task' has no attribute 'validate'
# on every insert, so ALL creates/saves returned HTTP 400 and nothing
# persisted. doc_events is only for hooking OTHER apps' doctypes or
# cross-doctype side effects, never an app's own controllers. Left empty
# intentionally.
doc_events = {}

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
