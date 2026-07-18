#!/bin/bash
# === Hambaft Production Diagnostic ===
# Run this on the SERVER to identify the exact cause of stale /frontend/ 404s
# Usage: bash diagnose-production.sh

set +e  # Don't stop on errors — we want all output

echo "============================================"
echo "  HAMBAFT PRODUCTION DIAGNOSTIC"
echo "============================================"
echo ""

BENCH_DIR="${1:-$HOME/frappe-bench/apps/hambaft}"
cd "$BENCH_DIR" 2>/dev/null || { echo "ERROR: Cannot cd to $BENCH_DIR"; exit 1; }

echo "--- Git HEAD ---"
git rev-parse --short HEAD
echo ""

echo "--- 1. hambaft/public/index.html (THIS IS WHAT FRAPPE SERVES) ---"
if [ -f hambaft/public/index.html ]; then
    echo "File exists. Size: $(wc -c < hambaft/public/index.html) bytes"
    echo "Last modified: $(stat -c '%y' hambaft/public/index.html 2>/dev/null || stat -f '%Sm' hambaft/public/index.html 2>/dev/null)"
    echo ""
    echo "JS reference:"
    grep -n "script.*src" hambaft/public/index.html || echo "  NONE FOUND"
    echo "CSS reference:"
    grep -n "stylesheet" hambaft/public/index.html || echo "  NONE FOUND"
    echo ""
    echo "Any /frontend/ references:"
    grep -n "/frontend/" hambaft/public/index.html || echo "  NONE (good)"
else
    echo "  FILE NOT FOUND"
fi
echo ""

echo "--- 2. Stale /frontend/ directory ---"
if [ -d hambaft/public/frontend ]; then
    echo "  ⚠⚠⚠ STALE hambaft/public/frontend/ EXISTS! This is the root cause!"
    echo "  Contents:"
    ls -la hambaft/public/frontend/ 2>/dev/null
    echo ""
    if [ -f hambaft/public/frontend/index.html ]; then
        echo "  Stale frontend/index.html contains:"
        grep -n "script.*src\|stylesheet" hambaft/public/frontend/index.html | head -5
    fi
else
    echo "  No stale hambaft/public/frontend/ (good)"
fi
echo ""

echo "--- 3. hambaft/public/ contents ---"
ls -la hambaft/public/
echo ""

echo "--- 4. hambaft/public/assets/ JS files ---"
ls -la hambaft/public/assets/index*.js 2>/dev/null || echo "  No index*.js files found"
ls -la hambaft/public/assets/index*.css 2>/dev/null || echo "  No index*.css files found"
echo ""

echo "--- 5. Frontend source sw.js cache version ---"
grep "CACHE_VERSION" frontend/public/sw.js 2>/dev/null || echo "  Not found"
echo ""

echo "--- 6. Deployed sw.js cache version ---"
grep "CACHE_VERSION" hambaft/public/sw.js 2>/dev/null || echo "  Not found"
echo ""

echo "--- 7. Live site: what does the server actually serve? ---"
echo "  Fetching https://hambaft.ir/assets/hambaft/index.html ..."
LIVE_HTML=$(curl -L --silent --connect-timeout 5 --max-time 10 https://hambaft.ir/assets/hambaft/index.html 2>/dev/null)
if [ -n "$LIVE_HTML" ]; then
    echo "  Server response received. Content:"
    echo "$LIVE_HTML" | grep -n "script.*src\|stylesheet\|/frontend/" | head -10
    echo ""
    echo "  Any /frontend/ references in live HTML:"
    echo "$LIVE_HTML" | grep -c "/frontend/" | xargs -I{} echo "  Count: {}"
else
    echo "  Could not reach the server (maybe run from inside the Docker container)"
fi
echo ""

echo "--- 8. Live site: check old JS bundle ---"
curl -I --silent --connect-timeout 5 --max-time 10 https://hambaft.ir/assets/hambaft/frontend/assets/index.BvFWhFH1.js 2>/dev/null | head -1 || echo "  Could not reach"
echo ""

echo "--- 9. Live site: check new JS bundle ---"
NEW_JS=$(grep -oP 'index\.[A-Za-z0-9_-]+\.js' hambaft/public/index.html 2>/dev/null | head -1)
if [ -n "$NEW_JS" ]; then
    echo "  Expected new bundle: /assets/hambaft/assets/$NEW_JS"
    curl -I --silent --connect-timeout 5 --max-time 10 "https://hambaft.ir/assets/hambaft/assets/$NEW_JS" 2>/dev/null | head -1 || echo "  Could not reach"
else
    echo "  Could not determine new JS bundle name"
fi
echo ""

echo "--- 10. Www page: check what /hambaft serves ---"
curl -L --silent --connect-timeout 5 --max-time 10 https://hambaft.ir/hambaft 2>/dev/null | grep -n "script.*src\|stylesheet\|/frontend/" | head -10 || echo "  Could not reach"
echo ""

echo "============================================"
echo "  DIAGNOSIS COMPLETE"
echo "============================================"
echo ""
echo "IF stale hambaft/public/frontend/ exists:"
echo "  → Run: rm -rf hambaft/public/frontend/"
echo "  → Run: cd frontend && npm run build && cd .."
echo "  → Run: bench clear-cache && bench clear-website-cache && bench restart"
echo ""
echo "IF hambaft/public/index.html contains /frontend/ references:"
echo "  → Run: cd frontend && npm run build && cd .."
echo "  → Verify: grep /frontend/ hambaft/public/index.html (should be empty)"
echo ""
echo "IF local files are correct but live site still serves old content:"
echo "  → Server/proxy cache issue — check nginx/CDN cache"
echo "  → Service worker cache — clear browser site data"
echo "  → bench restart may be needed to reload static files"
