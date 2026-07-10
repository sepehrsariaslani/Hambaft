# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from frappe import _
import os
import glob


def _get_asset_paths():
    """Find built frontend JS and CSS assets.

    Vite outputs to hambaft/public/ with base '/assets/hambaft/'.
    Frappe serves hambaft/public/ at /assets/hambaft/.
    So hambaft/public/assets/index.HASH.js -> /assets/hambaft/assets/index.HASH.js
    """
    public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
    assets_dir = os.path.join(public_dir, 'assets')
    js_path = None
    css_path = None
    try:
        # Look for hashed filenames: index.HASH.js, index.HASH.css
        js_files = sorted(glob.glob(os.path.join(assets_dir, 'index*.js')))
        css_files = sorted(glob.glob(os.path.join(assets_dir, 'index*.css')))
        if js_files:
            # Compute URL relative to Frappe's apps directory
            filename = os.path.basename(js_files[-1])
            js_path = '/assets/hambaft/assets/' + filename
        if css_files:
            filename = os.path.basename(css_files[-1])
            css_path = '/assets/hambaft/assets/' + filename
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
