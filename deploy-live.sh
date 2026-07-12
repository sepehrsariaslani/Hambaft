#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="${HAMBAFT_BACKEND_CONTAINER:-den-v16-backend}"
CONTAINER_APP_DIR="${HAMBAFT_CONTAINER_APP_DIR:-/home/frappe/frappe-bench/apps/hambaft}"
SITE_NAME="${HAMBAFT_SITE_NAME:-hambaft.ir}"
LIVE_ASSET_URL="${HAMBAFT_LIVE_ASSET_URL:-https://hambaft.ir/assets/hambaft/index.html}"
NGINX_HAMBAFT_CONF="${HAMBAFT_NGINX_CONF:-/etc/nginx/conf.d/hambaft.conf}"

step() {
  printf '\n[%s] %s\n' "$1" "$2"
}

fail() {
  printf '\nERROR: %s\n' "$1" >&2
  exit 1
}

run_in_container() {
  docker exec "$CONTAINER_NAME" bash -lic "$1"
}

capture_in_container() {
  run_in_container "$1" 2>/dev/null | sed '/^Commands restricted in prodution container/d;/^bash: cannot set terminal process group/d;/^bash: no job control in this shell/d;/^$/d'
}

step "1/6" "Checking container and paths"
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME" || fail "container '$CONTAINER_NAME' is not running"
run_in_container "test -d '$CONTAINER_APP_DIR'" || fail "app dir '$CONTAINER_APP_DIR' not found inside container"
if [ -f "$NGINX_HAMBAFT_CONF" ] && grep -q "public/frontend" "$NGINX_HAMBAFT_CONF"; then
  fail "nginx config still points to public/frontend in $NGINX_HAMBAFT_CONF"
fi

step "2/6" "Building frontend inside container"
run_in_container "cd '$CONTAINER_APP_DIR/frontend' && npm run build"

step "3/6" "Clearing Frappe caches inside container"
run_in_container "cd '$CONTAINER_APP_DIR' && (bench --site '$SITE_NAME' clear-cache || true) && (bench --site '$SITE_NAME' clear-website-cache || true) && (bench restart || true)"

step "4/6" "Reading published artifact metadata"
APP_PUBLIC_HASH="$(capture_in_container "sha256sum '$CONTAINER_APP_DIR/hambaft/public/index.html' | awk '{print \$1}'" | tail -n1)"
SITE_PUBLIC_PATH="/home/frappe/frappe-bench/sites/$SITE_NAME/public/index.html"
SITE_PUBLIC_HASH="$(capture_in_container "if [ -f '$SITE_PUBLIC_PATH' ]; then sha256sum '$SITE_PUBLIC_PATH' | awk '{print \$1}'; fi" | tail -n1)"
SW_VERSION="$(capture_in_container "grep 'CACHE_VERSION' '$CONTAINER_APP_DIR/hambaft/public/sw.js' | head -1 || true" | tail -n1)"
VERSION_MARKER="$(capture_in_container "grep -R -l \"version 2025-07-13-v9\" '$CONTAINER_APP_DIR/hambaft/public/assets' | head -1 || true" | tail -n1)"

printf 'app public hash : %s\n' "$APP_PUBLIC_HASH"
if [ -n "$SITE_PUBLIC_HASH" ]; then
  printf 'site public hash: %s\n' "$SITE_PUBLIC_HASH"
else
  printf 'site public hash: (missing)\n'
fi
printf 'sw version      : %s\n' "${SW_VERSION:-missing}"
printf 'version marker  : %s\n' "${VERSION_MARKER:-missing}"

step "5/6" "Checking live asset response"
CACHE_BUST="$(date +%s)"
LIVE_HTML="$(curl -fsSL "${LIVE_ASSET_URL}?_v=${CACHE_BUST}")" || fail "could not fetch ${LIVE_ASSET_URL}"
LIVE_HASH="$(printf '%s' "$LIVE_HTML" | sha256sum | awk '{print $1}')"
printf 'live asset hash : %s\n' "$LIVE_HASH"

step "6/6" "Verifying live site matches published build"
if [ "$LIVE_HASH" != "$APP_PUBLIC_HASH" ]; then
  cat >&2 <<EOF

Live asset is stale.
Expected: $APP_PUBLIC_HASH
Actual  : $LIVE_HASH

Meaning:
- the frontend build succeeded inside the container
- but https://hambaft.ir/assets/hambaft/index.html is still serving an older artifact

Check reverse proxy/CDN/static-file serving outside this repo.
EOF
  exit 2
fi

if [ -n "$SITE_PUBLIC_HASH" ] && [ "$SITE_PUBLIC_HASH" != "$APP_PUBLIC_HASH" ]; then
  cat >&2 <<EOF

Warning: site public copy does not match app public.
app public : $APP_PUBLIC_HASH
site public: $SITE_PUBLIC_HASH
EOF
fi

printf '\nDone. Live asset matches the latest build.\n'
