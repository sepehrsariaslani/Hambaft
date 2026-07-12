from __future__ import annotations

import glob
import os
import re


INLINE_JS_RE = re.compile(
    r'<script[^>]*type="module"[^>]*data-hambaft-inline="app"[^>]*>(.*?)</script>',
    re.DOTALL,
)
INLINE_CSS_RE = re.compile(
    r'<style[^>]*data-hambaft-inline="app"[^>]*>(.*?)</style>',
    re.DOTALL,
)
JS_PATH_RE = re.compile(r'src="(/assets/hambaft/assets/index\.[A-Za-z0-9_-]+\.js)"')
CSS_PATH_RE = re.compile(r'href="(/assets/hambaft/assets/index\.[A-Za-z0-9_-]+\.css)"')


def read_public_asset_context(public_dir: str) -> dict[str, str | None]:
    assets_dir = os.path.join(public_dir, "assets")
    context = {
        "js_path": None,
        "css_path": None,
        "inline_js": None,
        "inline_css": None,
    }

    index_html_path = os.path.join(public_dir, "index.html")
    if os.path.isfile(index_html_path):
        try:
            with open(index_html_path, "r", encoding="utf-8") as handle:
                html = handle.read()

            inline_js_match = INLINE_JS_RE.search(html)
            inline_css_match = INLINE_CSS_RE.search(html)
            if inline_js_match:
                context["inline_js"] = inline_js_match.group(1).strip()
            if inline_css_match:
                context["inline_css"] = inline_css_match.group(1).strip()

            if not context["inline_js"]:
                js_match = JS_PATH_RE.search(html)
                if js_match:
                    context["js_path"] = js_match.group(1)
            if not context["inline_css"]:
                css_match = CSS_PATH_RE.search(html)
                if css_match:
                    context["css_path"] = css_match.group(1)
        except Exception:
            pass

    if not context["inline_js"] and not context["js_path"]:
        try:
            js_files = sorted(glob.glob(os.path.join(assets_dir, "index*.js")))
            if js_files:
                context["js_path"] = "/assets/hambaft/assets/" + os.path.basename(js_files[-1])
        except Exception:
            pass

    if not context["inline_css"] and not context["css_path"]:
        try:
            css_files = sorted(glob.glob(os.path.join(assets_dir, "index*.css")))
            if css_files:
                context["css_path"] = "/assets/hambaft/assets/" + os.path.basename(css_files[-1])
        except Exception:
            pass

    return context
