# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from frappe import _
import os
import glob
import json


def _get_asset_paths():
    """Find built frontend JS and CSS assets.

    Strategy: Read index.html first (the Vite-generated manifest of what
    the current build actually references).  Fall back to glob if index.html
    is missing or unparseable.

    Vite outputs to hambaft/public/ with base '/assets/hambaft/'.
    Frappe serves hambaft/public/ at /assets/hambaft/.
    So hambaft/public/assets/index.HASH.js -> /assets/hambaft/assets/index.HASH.js
    """
    # Resolve paths relative to the app's public directory.
    # Works from both templates/pages/ and www/hambaft/ locations.
    public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
    assets_dir = os.path.join(public_dir, 'assets')
    js_path = None
    css_path = None

    # --- Strategy 1: parse index.html (authoritative) ---
    index_html_path = os.path.join(public_dir, 'index.html')
    if os.path.isfile(index_html_path):
        try:
            with open(index_html_path, 'r', encoding='utf-8') as f:
                html = f.read()
            # Extract the main JS bundle: <script ... src="/assets/hambaft/assets/index.HASH.js">
            import re
            js_match = re.search(r'src="(/assets/hambaft/assets/index\.[A-Za-z0-9_-]+\.js)"', html)
            if js_match:
                js_path = js_match.group(1)
            # Extract the main CSS: <link ... href="/assets/hambaft/assets/index.HASH.css">
            css_match = re.search(r'href="(/assets/hambaft/assets/index\.[A-Za-z0-9_-]+\.css)"', html)
            if css_match:
                css_path = css_match.group(1)
        except Exception:
            pass

    # --- Strategy 2: glob fallback ---
    if not js_path or not css_path:
        try:
            js_files = sorted(glob.glob(os.path.join(assets_dir, 'index*.js')))
            css_files = sorted(glob.glob(os.path.join(assets_dir, 'index*.css')))
            if js_files and not js_path:
                filename = os.path.basename(js_files[-1])
                js_path = '/assets/hambaft/assets/' + filename
            if css_files and not css_path:
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
