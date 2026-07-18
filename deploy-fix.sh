#!/bin/bash
# deploy-fix.sh — Run on the production server AFTER git pull
# Fixes stale assets, service worker, and ensures the latest build is active.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Hambaft Deploy Fix ==="
echo ""

# ────────────────────────────────────────────────────────────────
# STEP 1: Remove stale /frontend/ directories that cause 404s
# ────────────────────────────────────────────────────────────────
echo "[1/7] Removing stale /frontend/ directories..."
if [ -d "$SCRIPT_DIR/hambaft/public/frontend" ]; then
    rm -rf "$SCRIPT_DIR/hambaft/public/frontend"
    echo "  ✓ Removed hambaft/public/frontend/"
else
    echo "  ✓ No stale hambaft/public/frontend/ (good)"
fi
if [ -d "$SCRIPT_DIR/public/frontend" ]; then
    rm -rf "$SCRIPT_DIR/public/frontend"
    echo "  ✓ Removed public/frontend/"
else
    echo "  ✓ No stale public/frontend/ (good)"
fi

# ────────────────────────────────────────────────────────────────
# STEP 2: Remove stale root-level public/ and www/sw.js
# ────────────────────────────────────────────────────────────────
echo "[2/7] Removing stale root public/ and www/sw.js..."
if [ -d "$SCRIPT_DIR/public" ]; then
    rm -rf "$SCRIPT_DIR/public"
    echo "  ✓ Removed root public/"
else
    echo "  ✓ No stale root public/ (good)"
fi
if [ -f "$SCRIPT_DIR/www/sw.js" ]; then
    rm -f "$SCRIPT_DIR/www/sw.js"
    echo "  ✓ Removed stale www/sw.js"
else
    echo "  ✓ No stale www/sw.js (good)"
fi

# ────────────────────────────────────────────────────────────────
# STEP 3: Restore index.html from git (ensures correct paths)
# ────────────────────────────────────────────────────────────────
echo "[3/7] Restoring index.html from git..."
git checkout -- hambaft/public/index.html 2>/dev/null && echo "  ✓ Restored" || echo "  ⚠ Could not restore"

# ────────────────────────────────────────────────────────────────
# STEP 4: Install frontend deps and build
# ────────────────────────────────────────────────────────────────
echo "[4/7] Building frontend..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install --legacy-peer-deps 2>&1 | tail -1
fi
npm run build 2>&1 | tail -3
echo "  ✓ Frontend built"

# ────────────────────────────────────────────────────────────────
# STEP 5: Force-copy sw.js even if target is read-only
# (post-build.js uses read+write to avoid EPERM)
# ────────────────────────────────────────────────────────────────
echo "[5/7] Verifying sw.js..."
cd "$SCRIPT_DIR"
SW_SRC="frontend/public/sw.js"
SW_DST="hambaft/public/sw.js"
if [ -f "$SW_SRC" ]; then
    # Use cat+write to bypass EPERM on read-only target
    cat "$SW_SRC" > "$SW_DST" 2>/dev/null && echo "  ✓ sw.js updated" || echo "  ⚠ Could not update sw.js (check permissions)"
else
    echo "  ⚠ sw.js source not found"
fi

# ────────────────────────────────────────────────────────────────
# STEP 6: Clean stale hashed assets
# ────────────────────────────────────────────────────────────────
echo "[6/7] Cleaning stale hashed assets..."
if [ -f "$SCRIPT_DIR/hambaft/public/index.html" ] && [ -d "$SCRIPT_DIR/hambaft/public/assets" ]; then
    REFS=$(grep -oP 'assets/[A-Za-z0-9_.-]+\.(js|css)' "$SCRIPT_DIR/hambaft/public/index.html" | sort -u)
    MAIN_JS=$(grep -oP 'index\.[A-Za-z0-9_-]+\.js' "$SCRIPT_DIR/hambaft/public/index.html" | head -1)
    if [ -n "$MAIN_JS" ] && [ -f "$SCRIPT_DIR/hambaft/public/assets/$MAIN_JS" ]; then
        REFS="$REFS
$(grep -oP '[A-Za-z0-9_.-]+\.(js|css)' "$SCRIPT_DIR/hambaft/public/assets/$MAIN_JS" | sort -u)"
    fi
    KEPT=0
    REMOVED=0
    for f in "$SCRIPT_DIR/hambaft/public/assets/"*.js "$SCRIPT_DIR/hambaft/public/assets/"*.css; do
        [ -f "$f" ] || continue
        BASENAME=$(basename "$f")
        if echo "$REFS" | grep -q "$BASENAME"; then
            KEPT=$((KEPT + 1))
        else
            rm -f "$f"
            REMOVED=$((REMOVED + 1))
        fi
    done
    echo "  ✓ Kept $KEPT, removed $REMOVED stale assets"
else
    echo "  ✓ No assets to clean"
fi

# ────────────────────────────────────────────────────────────────
# STEP 7: Verify index.html references
# ────────────────────────────────────────────────────────────────
echo "[7/7] Verifying published copies..."
if [ -f "$SCRIPT_DIR/hambaft/public/index.html" ] && [ -f "/home/frappe/frappe-bench/sites/hambaft.ir/public/index.html" ]; then
    APP_HASH=$(sha256sum "$SCRIPT_DIR/hambaft/public/index.html" | awk '{print $1}')
    SITE_HASH=$(sha256sum "/home/frappe/frappe-bench/sites/hambaft.ir/public/index.html" | awk '{print $1}')
    if [ "$APP_HASH" = "$SITE_HASH" ]; then
        echo "  ✓ site public is synced with app public"
    else
        echo "  ⚠ site public is NOT synced with app public"
        echo "    app : $APP_HASH"
        echo "    site: $SITE_HASH"
    fi
else
    echo "  ✓ Site public verification skipped"
fi
echo ""
echo "[8/8] Verifying index.html..."
echo ""
echo "  Script src:"
grep "script.*src" "$SCRIPT_DIR/hambaft/public/index.html" 2>/dev/null || echo "    (not found)"
echo "  Stylesheet href:"
grep "stylesheet" "$SCRIPT_DIR/hambaft/public/index.html" 2>/dev/null || echo "    (not found)"
echo ""
echo "  sw.js cache version:"
grep "CACHE_VERSION" "$SCRIPT_DIR/hambaft/public/sw.js" 2>/dev/null || echo "    (sw.js not found)"
echo ""

# Check for stale /frontend/ references
if grep -q "/frontend/" "$SCRIPT_DIR/hambaft/public/index.html" 2>/dev/null; then
    echo "  ⚠⚠⚠ WARNING: index.html still contains /frontend/ references!"
    echo "  This will cause 404s. Something is wrong with the build."
else
    echo "  ✓ No stale /frontend/ references in index.html"
fi

echo ""
echo "=== Deploy fix complete ==="
echo ""
echo "NEXT STEPS (run in order):"
echo "  1. bench --site hambaft.ir migrate"
echo "  2. bench --site hambaft.ir execute hambaft.hambaft.api.run_task_status_migration"
echo "  3. bench --site hambaft.ir execute hambaft.hambaft.api.run_project_tasks_migration"
echo "  4. bench build"
echo "  5. AFTER bench build, re-run this script to restore index.html:"
echo "     bash deploy-fix.sh"
echo "  6. bench clear-cache && bench clear-website-cache && bench restart"
echo "  7. Hard-refresh browser (Ctrl+Shift+R) or clear browser site data"
