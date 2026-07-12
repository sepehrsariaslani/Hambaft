from __future__ import annotations

import os
import tempfile
import unittest


class TestAssetContext(unittest.TestCase):
    def test_reads_inline_assets_from_public_index(self):
        from hambaft.asset_context import read_public_asset_context

        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "index.html"), "w", encoding="utf-8") as handle:
                handle.write(
                    '<style data-hambaft-inline="app">body{color:#123456;}</style>\n'
                    '<script type="module" data-hambaft-inline="app">console.log("$& $1 $$ literal")</script>\n'
                )

            asset_context = read_public_asset_context(tmpdir)

        self.assertIsNone(asset_context["js_path"])
        self.assertIsNone(asset_context["css_path"])
        self.assertEqual(asset_context["inline_css"], "body{color:#123456;}")
        self.assertEqual(
            asset_context["inline_js"],
            'console.log("$& $1 $$ literal")',
        )


if __name__ == "__main__":
    unittest.main()
