# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from frappe import _
import os
import glob


def _get_asset_paths():
    """Find built frontend JS and CSS assets."""
    build_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'frontend')
    assets_dir = os.path.join(build_dir, 'assets')
    js_path = None
    css_path = None
    try:
        js_files = sorted(glob.glob(os.path.join(assets_dir, 'index*.js')))
        css_files = sorted(glob.glob(os.path.join(assets_dir, 'index*.css')))
        if js_files:
            rel = os.path.relpath(js_files[0], '/home/frappe/frappe-bench/apps')
            js_path = '/assets/' + rel
        if css_files:
            rel = os.path.relpath(css_files[0], '/home/frappe/frappe-bench/apps')
            css_path = '/assets/' + rel
    except Exception:
        pass
    return js_path, css_path


def get_context(context):
    context.no_cache = 1
    context.title = _("Hambaft")
    js_path, css_path = _get_asset_paths()
    context.js_path = js_path
    context.css_path = css_path
    return context
