#!/bin/bash
# deploy-fix.sh — Run on the production server after git pull
# Cleans stale build artifacts that git no longer tracks
# and ensures the latest frontend build is active.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Hambaft Deploy Cleanup ==="
echo ""

# 1. Remove stale hambaft/public/frontend/ directory
#    This was from an old Vite config that output to a nested frontend/ path.
#    It causes 404s because the old index.html references /assets/hambaft/frontend/assets/
if [ -d "$SCRIPT_DIR/hambaft/public/frontend" ]; then
    echo "[1/6] Removing stale hambaft/public/frontend/ ..."
    rm -rf "$SCRIPT_DIR/hambaft/public/frontend"
    echo "  ✓ Removed"
else
    echo "[1/6] No stale hambaft/public/frontend/ found (good)"
fi

# 2. Remove stale root-level public/ directory
if [ -d "$SCRIPT_DIR/public" ]; then
    echo "[2/6] Removing stale root public/ ..."
    rm -rf "$SCRIPT_DIR/public"
    echo "  ✓ Removed"
else
    echo "[2/6] No stale root public/ found (good)"
fi

# 3. Remove stale www/sw.js (old v3 service worker)
if [ -f "$SCRIPT_DIR/www/sw.js" ]; then
    echo "[3/6] Removing stale www/sw.js ..."
    rm -f "$SCRIPT_DIR/www/sw.js"
    echo "  ✓ Removed"
else
    echo "[3/6] No stale www/sw.js found (good)"
fi

# 4. CRITICAL: Replace hambaft/public/index.html with the git-tracked version
#    The npm build may have overwritten it with an old version, or bench build
#    may have cached it. We restore the git version to guarantee correct paths.
echo "[4/6] Restoring hambaft/public/index.html from git ..."
cd "$SCRIPT_DIR"
git checkout -- hambaft/public/index.html 2>/dev/null && echo "  ✓ Restored from git" || echo "  ⚠ Could not restore (will be created by npm run build)"

# 5. Remove stale hashed assets from hambaft/public/assets/
if [ -f "$SCRIPT_DIR/hambaft/public/index.html" ] && [ -d "$SCRIPT_DIR/hambaft/public/assets" ]; then
    echo "[5/6] Cleaning stale hashed assets..."
    REFS=$(grep -oP 'assets/[A-Za-z0-9_.-]+\.(js|css)' "$SCRIPT_DIR/hambaft/public/index.html" | sort -u)
    # Also scan the main JS for dynamic imports
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
    echo "  ✓ Kept $KEPT current assets, removed $REMOVED stale assets"
else
    echo "[5/6] No index.html or assets dir — will be created by npm run build"
fi

# 6. Rebuild frontend (must run AFTER git checkout of index.html so Vite can overwrite)
echo "[6/6] Rebuilding frontend..."
cd "$SCRIPT_DIR/frontend"
if [ -d "node_modules" ]; then
    npm run build 2>&1 | tail -3
    echo "  ✓ Frontend rebuilt"
else
    echo "  ⚠ node_modules not found — run: cd frontend && npm install && npm run build"
fi

echo ""
echo "=== Cleanup complete ==="
echo ""
echo "VERIFICATION — hambaft/public/index.html should reference /assets/hambaft/assets/:"
grep "script.*src" "$SCRIPT_DIR/hambaft/public/index.html" 2>/dev/null || echo "  (index.html not found)"
echo ""
echo "Next steps:"
echo "  1. bench --site <site_name> migrate"
echo "  2. bench --site <site_name> execute hambaft.hambaft.api.run_task_status_migration"
echo "  3. bench --site <site_name> execute hambaft.hambaft.api.run_project_tasks_migration"
echo "  4. bench build && bench clear-cache && bench clear-website-cache && bench restart"
echo "  5. Hard-refresh browser (Ctrl+Shift+R) or clear browser cache"
