from __future__ import annotations

import json
import os
import unittest


class TestAiSchema(unittest.TestCase):
    def test_ai_message_is_not_a_child_table(self):
        path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "doctype",
            "hambaft_ai_message",
            "hambaft_ai_message.json",
        )
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)

        self.assertFalse(
            payload.get("istable"),
            "Hambaft AI Message must be a normal DocType so ai_coach_chat can insert standalone rows.",
        )


if __name__ == "__main__":
    unittest.main()
