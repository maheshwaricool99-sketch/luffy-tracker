#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="${PM2_APP_NAME:-luffy-app}"
APP_PORT="${APP_PORT:-3000}"
APP_URL="http://127.0.0.1:${APP_PORT}"
MAX_RETRIES="${MAX_RETRIES:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

cd "$ROOT_DIR"

echo "[production-smoke] app=${APP_NAME} port=${APP_PORT}"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "[production-smoke] stopping ${APP_NAME}"
  pm2 stop "$APP_NAME" >/dev/null
else
  echo "[production-smoke] ${APP_NAME} is not registered in pm2 yet"
fi

echo "[production-smoke] cleaning old build artifacts"
rm -rf .next

echo "[production-smoke] building"
npm run build

echo "[production-smoke] verifying build artifacts"
test -f .next/BUILD_ID
test -d .next/server
test -d .next/static
if [[ ! -f .next/server/proxy-manifest.json && ! -f .next/server/middleware-manifest.json ]]; then
  echo "[production-smoke] missing proxy/middleware manifest in .next/server" >&2
  exit 1
fi

echo "[production-smoke] restarting ${APP_NAME}"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env >/dev/null
else
  pm2 start npm --name "$APP_NAME" -- start >/dev/null
fi

echo "[production-smoke] waiting for ${APP_URL}"
for attempt in $(seq 1 "$MAX_RETRIES"); do
  if curl -fsS "$APP_URL" >/dev/null; then
    echo "[production-smoke] PASS app responded on attempt ${attempt}"
    exit 0
  fi
  sleep "$SLEEP_SECONDS"
done

echo "[production-smoke] FAIL app did not respond after ${MAX_RETRIES} attempts" >&2
pm2 logs "$APP_NAME" --lines 80 --nostream || true
exit 1
