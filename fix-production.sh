#!/bin/bash
# === Hambaft Production Fix ===
# Run this on the SERVER to fix stale /frontend/ 404s
# This script is idempotent — safe to run multiple times
#
# PREREQUISITE: Already ran git pull and on correct branch
set -e

BENCH_DIR="${1:-$HOME/frappe-bench/apps/hambaft}"
cd "$BENCH_DIR" 2>/dev/null || { echo "ERROR: Cannot cd to $BENCH_DIR"; exit 1; }

echo "=== Hambaft Production Fix ==="
echo "Working directory: $(pwd)"
echo "Git HEAD: $(git rev-parse --short HEAD)"
echo ""

# ─── STEP 1: Nuke stale /frontend/ directories ───
echo "[1/6] Removing stale /frontend/ directories..."
rm -rf hambaft/public/frontend/ 2>/dev/null && echo "  ✓ Removed hambaft/public/frontend/" || echo "  ✓ No hambaft/public/frontend/ (good)"
rm -rf public/frontend/ 2>/dev/null && echo "  ✓ Removed public/frontend/" || echo "  ✓ No public/frontend/ (good)"
rm -f www/sw.js 2>/dev/null && echo "  ✓ Removed www/sw.js" || echo "  ✓ No www/sw.js (good)"

# ─── STEP 2: Restore index.html from git ───
echo "[2/6] Restoring index.html from git..."
git checkout -- hambaft/public/index.html 2>/dev/null && echo "  ✓ Restored" || echo "  ⚠ Could not restore"

# Verify it's clean
if grep -q "/frontend/" hambaft/public/index.html 2>/dev/null; then
    echo "  ⚠⚠⚠ index.html still has /frontend/ after git checkout!"
    echo "  This means the committed version is stale. Checking further..."
fi

# ─── STEP 3: npm install + build ───
echo "[3/6] Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install --legacy-peer-deps 2>&1 | tail -1
fi
npm run build 2>&1 | tail -3
cd ..
echo "  ✓ Built"

# ─── STEP 4: Verify build output ───
echo "[4/6] Verifying build output..."
if [ ! -f hambaft/public/index.html ]; then
    echo "  ⚠⚠⚠ index.html NOT FOUND after build!"
    exit 1
fi

JS_REF=$(grep -oP 'src="/assets/hambaft/assets/index\.[A-Za-z0-9_-]+\.js"' hambaft/public/index.html | head -1)
CSS_REF=$(grep -oP 'href="/assets/hambaft/assets/index\.[A-Za-z0-9_-]+\.css"' hambaft/public/index.html | head -1)

if [ -z "$JS_REF" ]; then
    echo "  ⚠⚠⚠ No JS reference found in index.html!"
    echo "  Content:"
    cat hambaft/public/index.html
    exit 1
fi

echo "  JS: $JS_REF"
echo "  CSS: $CSS_REF"

# Check for /frontend/ contamination
if grep -q "/frontend/" hambaft/public/index.html; then
    echo "  ⚠⚠⚠ index.html still contains /frontend/ references!"
    echo "  Something is wrong with the build."
    echo "  Content:"
    cat hambaft/public/index.html
    exit 1
fi
echo "  ✓ No /frontend/ references in index.html"

# Check the actual JS file exists
JS_FILE=$(echo "$JS_REF" | grep -oP 'index\.[A-Za-z0-9_-]+\.js')
if [ -f "hambaft/public/assets/$JS_FILE" ]; then
    JS_SIZE=$(wc -c < "hambaft/public/assets/$JS_FILE")
    echo "  ✓ JS bundle exists ($JS_SIZE bytes)"
else
    echo "  ⚠⚠⚠ JS bundle NOT FOUND: hambaft/public/assets/$JS_FILE"
    echo "  Available files:"
    ls hambaft/public/assets/index*.js 2>/dev/null || echo "    (none)"
fi

# ─── STEP 5: Force-copy sw.js ───
echo "[5/6] Updating sw.js..."
if [ -f frontend/public/sw.js ]; then
    cat frontend/public/sw.js > hambaft/public/sw.js 2>/dev/null && echo "  ✓ sw.js updated" || echo "  ⚠ Could not update sw.js"
    SW_VER=$(grep "CACHE_VERSION" hambaft/public/sw.js | head -1)
    echo "  $SW_VER"
fi

# ─── STEP 6: Clear caches and restart ───
echo "[6/6] Clearing caches..."
bench clear-cache 2>/dev/null && echo "  ✓ bench clear-cache" || echo "  ⚠ bench clear-cache failed"
bench clear-website-cache 2>/dev/null && echo "  ✓ bench clear-website-cache" || echo "  ⚠ bench clear-website-cache failed"

echo ""
echo "=== Fix complete ==="
echo ""
echo "NOW RUN: bench restart"
echo ""
echo "VERIFICATION COMMANDS (run after bench restart):"
echo "  1. cat hambaft/public/index.html | grep 'script.*src'"
echo "     → Should show /assets/hambaft/assets/index.<hash>.js (NOT /frontend/)"
echo ""
echo "  2. curl -s https://hambaft.ir/assets/hambaft/index.html | grep 'script.*src'"
echo "     → Must match local file (NOT /frontend/)"
echo ""
echo "  3. curl -sI https://hambaft.ir/assets/hambaft/assets/index.<hash>.js | head -1"
echo "     → Must be HTTP 200"
echo ""
echo "  4. Hard-refresh browser: Ctrl+Shift+R"
echo "     → Or clear site data in DevTools > Application > Storage"
