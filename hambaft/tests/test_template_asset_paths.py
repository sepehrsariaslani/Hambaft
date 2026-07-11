from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
import types
import unittest


class TestTemplatePageAssetPaths(unittest.TestCase):
    def test_hambaft_template_page_reads_public_index_from_app_public_dir(self):
        fake_frappe = types.ModuleType("frappe")
        fake_frappe._ = lambda value: value
        original_frappe = sys.modules.get("frappe")
        sys.modules["frappe"] = fake_frappe
        try:
            module_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "templates", "pages", "hambaft.py")
            )
            spec = importlib.util.spec_from_file_location("test_hambaft_template_page", module_path)
            module = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(module)
        finally:
            if original_frappe is None:
                sys.modules.pop("frappe", None)
            else:
                sys.modules["frappe"] = original_frappe

        with tempfile.TemporaryDirectory() as tmpdir:
            template_dir = os.path.join(tmpdir, "templates", "pages")
            public_dir = os.path.join(tmpdir, "public")
            os.makedirs(template_dir, exist_ok=True)
            os.makedirs(public_dir, exist_ok=True)

            index_html = os.path.join(public_dir, "index.html")
            with open(index_html, "w", encoding="utf-8") as handle:
                handle.write(
                    '<link rel="stylesheet" href="/assets/hambaft/assets/index.TEST.css">\n'
                    '<script type="module" src="/assets/hambaft/assets/index.TEST.js"></script>\n'
                )

            original_file = module.__file__
            try:
                module.__file__ = os.path.join(template_dir, "hambaft.py")
                js_path, css_path = module._get_asset_paths()
            finally:
                module.__file__ = original_file

        self.assertEqual(js_path, "/assets/hambaft/assets/index.TEST.js")
        self.assertEqual(css_path, "/assets/hambaft/assets/index.TEST.css")


if __name__ == "__main__":
    unittest.main()
