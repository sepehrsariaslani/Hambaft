#!/bin/bash
# full-deploy.sh — Complete deploy script for Hambaft
# Handles: git pull, build, Frappe cache, SW cache, site sync
# Run from: ~/den-v16-docker/apps/hambaft
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════╗"
echo "║       Hambaft Full Deploy                    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── STEP 1: Git pull ─────────────────────────────────────────
echo "[1/8] Pulling latest code..."
git pull origin feat/areas-views-notion 2>&1 | tail -3
echo "  ✓ Code updated"
echo ""

# ── STEP 2: Clean stale directories ──────────────────────────
echo "[2/8] Cleaning stale directories..."
rm -rf "$SCRIPT_DIR/hambaft/public/frontend" 2>/dev/null && echo "  ✓ Removed hambaft/public/frontend/" || true
rm -rf "$SCRIPT_DIR/public" 2>/dev/null && echo "  ✓ Removed root public/" || true
rm -f "$SCRIPT_DIR/www/sw.js" 2>/dev/null && echo "  ✓ Removed www/sw.js" || true
echo ""

# ── STEP 3: Build frontend ───────────────────────────────────
echo "[3/8] Building frontend..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install --legacy-peer-deps 2>&1 | tail -1
fi
npm run build 2>&1 | tail -5
echo "  ✓ Frontend built"
echo ""

# ── STEP 4: Verify sw.js version ─────────────────────────────
echo "[4/8] Verifying SW cache version..."
SW_VER=$(grep "CACHE_VERSION" "$SCRIPT_DIR/hambaft/public/sw.js" | head -1)
echo "  $SW_VER"
echo ""

# ── STEP 5: Clear Frappe caches ──────────────────────────────
echo "[5/8] Clearing Frappe caches..."
# Try bench commands first
if command -v bench &>/dev/null; then
    bench clear-cache 2>&1 | tail -1 && echo "  ✓ bench clear-cache" || echo "  ⚠ bench clear-cache failed"
    bench clear-website-cache 2>&1 | tail -1 && echo "  ✓ bench clear-website-cache" || echo "  ⚠ bench clear-website-cache failed"
else
    echo "  bench not available, trying Redis directly..."
    redis-cli FLUSHALL 2>/dev/null && echo "  ✓ Redis FLUSHALL" || echo "  ⚠ Redis FLUSHALL failed"
fi
echo ""

# ── STEP 6: Sync to site public directory ─────────────────────
echo "[6/8] Syncing to site directories..."
SITES_DIR=""

# Find the bench sites directory
for candidate in "/home/frappe/frappe-bench/sites" "/home/user/frappe-bench/sites" "../sites" "../../sites"; do
    if [ -d "$candidate" ]; then
        SITES_DIR="$candidate"
        break
    fi
done

if [ -n "$SITES_DIR" ]; then
    # Sync assets to sites/assets/hambaft
    ASSETS_DST="$SITES_DIR/assets/hambaft"
    if [ -d "$ASSETS_DST" ] || [ -d "$(dirname "$ASSETS_DST")" ]; then
        mkdir -p "$ASSETS_DST/assets"
        # Copy index.html
        cp -f "$SCRIPT_DIR/hambaft/public/index.html" "$ASSETS_DST/" 2>/dev/null && echo "  ✓ Synced index.html → sites/assets/hambaft/" || true
        # Copy assets
        cp -rf "$SCRIPT_DIR/hambaft/public/assets/"* "$ASSETS_DST/assets/" 2>/dev/null && echo "  ✓ Synced assets → sites/assets/hambaft/assets/" || true
        # Copy static files
        for f in sw.js manifest.json hambaft-icon.svg; do
            cp -f "$SCRIPT_DIR/hambaft/public/$f" "$ASSETS_DST/" 2>/dev/null || true
        done
        echo "  ✓ Synced to sites/assets/hambaft/"
    fi

    # Find site-specific public directory
    for site_dir in "$SITES_DIR"/*/public; do
        if [ -d "$site_dir" ]; then
            SITE_NAME=$(basename "$(dirname "$site_dir")")
            cp -f "$SCRIPT_DIR/hambaft/public/index.html" "$site_dir/" 2>/dev/null && echo "  ✓ Synced index.html → sites/$SITE_NAME/public/" || true
            mkdir -p "$site_dir/assets"
            cp -rf "$SCRIPT_DIR/hambaft/public/assets/"* "$site_dir/assets/" 2>/dev/null || true
            for f in sw.js manifest.json hambaft-icon.svg; do
                cp -f "$SCRIPT_DIR/hambaft/public/$f" "$site_dir/" 2>/dev/null || true
            done
            echo "  ✓ Synced to sites/$SITE_NAME/public/"
        fi
    done
else
    echo "  ⚠ Could not find sites directory"
fi
echo ""

# ── STEP 7: Restart services ─────────────────────────────────
echo "[7/8] Restarting services..."
if command -v supervisorctl &>/dev/null; then
    supervisorctl restart all 2>&1 | tail -1 && echo "  ✓ supervisorctl restart all" || echo "  ⚠ supervisorctl restart failed"
elif command -v bench &>/dev/null; then
    bench restart 2>&1 | tail -1 && echo "  ✓ bench restart" || echo "  ⚠ bench restart failed"
else
    echo "  ⚠ No restart method available"
fi
echo ""

# ── STEP 8: Verification ─────────────────────────────────────
echo "[8/8] Verification..."
echo ""

# Check inline assets in index.html
if grep -q 'data-hambaft-inline="app"' "$SCRIPT_DIR/hambaft/public/index.html" 2>/dev/null; then
    INLINE_SIZE=$(wc -c < "$SCRIPT_DIR/hambaft/public/index.html")
    echo "  ✓ Inline assets present (index.html = $INLINE_SIZE bytes)"
else
    echo "  ⚠ No inline assets found in index.html"
fi

# Check SW version
echo "  SW: $(grep CACHE_VERSION "$SCRIPT_DIR/hambaft/public/sw.js" | head -1)"

# Check for stale /frontend/ references
if grep -q "/frontend/" "$SCRIPT_DIR/hambaft/public/index.html" 2>/dev/null; then
    echo "  ⚠⚠⚠ WARNING: /frontend/ references still in index.html!"
else
    echo "  ✓ No stale /frontend/ references"
fi

# Check TaskDetailPage is in the bundle
if grep -q "TaskDetailPage" "$SCRIPT_DIR/hambaft/public/assets/"*.js 2>/dev/null; then
    echo "  ✓ TaskDetailPage found in JS bundle"
else
    echo "  ⚠ TaskDetailPage NOT found in JS bundle"
fi

# Check onOpenFullPage is in the bundle
if grep -q "onOpenFullPage" "$SCRIPT_DIR/hambaft/public/assets/"*.js 2>/dev/null; then
    echo "  ✓ onOpenFullPage found in JS bundle"
else
    echo "  ⚠ onOpenFullPage NOT found in JS bundle"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       Deploy Complete!                       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "🔴 IMPORTANT — You MUST do this in your browser:"
echo "   1. Close ALL hambaft tabs completely"
echo "   2. Open DevTools → Application → Service Workers → Unregister"
echo "   3. Clear browser cache: Ctrl+Shift+Delete → Cached images+files"
echo "   4. Open hambaft in a NEW tab"
echo ""
