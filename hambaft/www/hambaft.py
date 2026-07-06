from __future__ import annotations

from frappe import _

from hambaft.hambaft.www.hambaft.index import _get_asset_paths


def get_context(context):
    context.no_cache = 1
    context.title = _("Hambaft")
    js_path, css_path = _get_asset_paths()
    context.js_path = js_path
    context.css_path = css_path
    return context
