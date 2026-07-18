from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
import types
import unittest


class TestTemplatePageAssetPaths(unittest.TestCase):
    def _load_module(self, relative_path: str, module_name: str):
        fake_frappe = types.ModuleType("frappe")
        fake_frappe._ = lambda value: value
        original_frappe = sys.modules.get("frappe")
        sys.modules["frappe"] = fake_frappe
        try:
            module_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", relative_path)
            )
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            module = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(module)
            return module
        finally:
            if original_frappe is None:
                sys.modules.pop("frappe", None)
            else:
                sys.modules["frappe"] = original_frappe

    def test_hambaft_template_page_reads_public_index_from_app_public_dir(self):
        module = self._load_module("hambaft/templates/pages/hambaft.py", "test_hambaft_template_page")

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

    def test_root_www_page_reads_public_index_from_app_public_dir(self):
        module = self._load_module("www/hambaft.py", "test_root_www_hambaft_page")

        with tempfile.TemporaryDirectory() as tmpdir:
            www_dir = os.path.join(tmpdir, "www")
            app_public_dir = os.path.join(tmpdir, "hambaft", "public")
            os.makedirs(www_dir, exist_ok=True)
            os.makedirs(app_public_dir, exist_ok=True)

            index_html = os.path.join(app_public_dir, "index.html")
            with open(index_html, "w", encoding="utf-8") as handle:
                handle.write(
                    '<link rel="stylesheet" href="/assets/hambaft/assets/index.ROOT.css">\n'
                    '<script type="module" src="/assets/hambaft/assets/index.ROOT.js"></script>\n'
                )

            original_file = module.__file__
            try:
                module.__file__ = os.path.join(www_dir, "hambaft.py")
                js_path, css_path = module._get_asset_paths()
            finally:
                module.__file__ = original_file

        self.assertEqual(js_path, "/assets/hambaft/assets/index.ROOT.js")
        self.assertEqual(css_path, "/assets/hambaft/assets/index.ROOT.css")


if __name__ == "__main__":
    unittest.main()
