#!/bin/bash
# deploy-fix.sh — Run on the production server after git pull
# This cleans stale build artifacts that git no longer tracks
# and ensures the latest frontend build is active.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/hambaft/public"

echo "=== Hambaft Deploy Cleanup ==="

# 1. Remove stale frontend/ subdirectory inside hambaft/public/
#    (old build output with paths like /assets/hambaft/frontend/assets/)
if [ -d "$PUBLIC_DIR/frontend" ]; then
    echo "Removing stale hambaft/public/frontend/ ..."
    rm -rf "$PUBLIC_DIR/frontend"
    echo "  ✓ Removed"
else
    echo "  No stale hambaft/public/frontend/ found (good)"
fi

# 2. Remove stale root-level public/ directory
#    (old build output from previous Vite config)
if [ -d "$SCRIPT_DIR/public" ]; then
    echo "Removing stale root public/ ..."
    rm -rf "$SCRIPT_DIR/public"
    echo "  ✓ Removed"
else
    echo "  No stale root public/ found (good)"
fi

# 3. Remove stale www/sw.js (old v3 service worker)
if [ -f "$SCRIPT_DIR/www/sw.js" ]; then
    echo "Removing stale www/sw.js ..."
    rm -f "$SCRIPT_DIR/www/sw.js"
    echo "  ✓ Removed"
else
    echo "  No stale www/sw.js found (good)"
fi

# 4. Clean stale hashed assets from hambaft/public/assets/
#    Keep only the ones referenced by the current index.html
if [ -f "$PUBLIC_DIR/index.html" ] && [ -d "$PUBLIC_DIR/assets" ]; then
    echo "Cleaning stale hashed assets..."
    # Extract referenced filenames from index.html
    REFS=$(grep -oP 'assets/[A-Za-z0-9_.-]+\.(js|css)' "$PUBLIC_DIR/index.html" | sort -u)
    KEPT=0
    REMOVED=0
    for f in "$PUBLIC_DIR/assets/"*.js "$PUBLIC_DIR/assets/"*.css; do
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
    echo "  No index.html or assets dir found — will be created by npm run build"
fi

echo ""
echo "=== Cleanup complete ==="
echo ""
echo "Next steps:"
echo "  1. cd frontend && npm install && npm run build"
echo "  2. bench --site <site_name> migrate"
echo "  3. bench --site <site_name> execute hambaft.hambaft.api.run_task_status_migration"
echo "  4. bench build && bench clear-cache && bench clear-website-cache && bench restart"
