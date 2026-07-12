from __future__ import annotations

import os

from hambaft.asset_context import read_public_asset_context


def _get_public_dir():
    return os.path.join(os.path.dirname(__file__), "..", "hambaft", "public")


def _get_asset_paths():
    asset_context = read_public_asset_context(_get_public_dir())
    return asset_context["js_path"], asset_context["css_path"]


def get_context(context):
    context.no_cache = 1
    context.title = "Hambaft"
    asset_context = read_public_asset_context(_get_public_dir())
    context.js_path = asset_context["js_path"]
    context.css_path = asset_context["css_path"]
    context.inline_js = asset_context["inline_js"]
    context.inline_css = asset_context["inline_css"]
    return context
