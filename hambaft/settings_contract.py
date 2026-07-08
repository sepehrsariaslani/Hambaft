from __future__ import annotations

import json

SETTINGS_FIELDS = (
    "display_name",
    "motto",
    "work_field",
    "daily_water_goal",
    "sleep_goal_hours",
    "monthly_budget",
    "language",
    "timezone",
    "currency",
    "theme",
    "week_starts_on",
    "onboarding_completed",
    "onboarding_step",
    "default_view",
    "reminder_notifications",
    "daily_reminder_time",
    "life_score_target",
    "notion_pages_json",
    "sleep_preferences_json",
    "custom_exercises_json",
    "finance_quick_templates_json",
    "calendar_preferences_json",
    "custom_calendars_json",
    "debts_json",
    "subscriptions_json",
    "recurring_transactions_json",
    "assets_json",
    "installments_json",
    "diet_setting_json",
    "budget_settings_json",
    "subcategories_json",
    "task_time_json",
    "daily_highlights_json",
    "goal_habits_json",
)


def get_supported_settings_fields(available_fields=None):
    available = set(available_fields or SETTINGS_FIELDS)
    return tuple(fieldname for fieldname in SETTINGS_FIELDS if fieldname in available)


def normalize_settings_update(data, available_fields=None):
    if isinstance(data, str):
        data = json.loads(data)

    if not isinstance(data, dict):
        return {}

    supported_fields = set(get_supported_settings_fields(available_fields))
    normalized = {}

    for fieldname, value in data.items():
        if fieldname not in supported_fields:
            continue

        if fieldname.endswith("_json") and isinstance(value, (dict, list)):
            normalized[fieldname] = json.dumps(value, ensure_ascii=False)
            continue

        normalized[fieldname] = value

    return normalized
