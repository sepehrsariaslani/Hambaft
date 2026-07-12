from __future__ import annotations

import os
import unittest


class TestPwaTemplatePaths(unittest.TestCase):
    def test_frontend_entry_uses_root_manifest_and_icon(self):
        path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "frontend",
            "index.html",
        )
        with open(path, "r", encoding="utf-8") as handle:
            html = handle.read()

        self.assertIn('href="/manifest.json"', html)
        self.assertIn('href="/hambaft-icon.svg"', html)


if __name__ == "__main__":
    unittest.main()
