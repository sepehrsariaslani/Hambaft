from __future__ import annotations

import unittest

from hambaft.settings_contract import normalize_settings_update


class TestNormalizeSettingsUpdate(unittest.TestCase):
    def test_filters_unknown_fields_and_serializes_json_blobs(self):
        payload = normalize_settings_update(
            {
                "theme": "تاریک",
                "calendar_preferences_json": {"showEvents": True, "showTasks": False},
                "ignored_key": "x",
            },
            available_fields={"theme", "calendar_preferences_json"},
        )

        self.assertEqual(payload["theme"], "تاریک")
        self.assertEqual(
            payload["calendar_preferences_json"],
            '{"showEvents": true, "showTasks": false}',
        )
        self.assertNotIn("ignored_key", payload)

    def test_accepts_nested_json_string_payload(self):
        payload = normalize_settings_update(
            '{"sleep_preferences_json": {"targetWakeTime": "06:30"}}',
            available_fields={"sleep_preferences_json"},
        )

        self.assertEqual(
            payload,
            {"sleep_preferences_json": '{"targetWakeTime": "06:30"}'},
        )


if __name__ == "__main__":
    unittest.main()
