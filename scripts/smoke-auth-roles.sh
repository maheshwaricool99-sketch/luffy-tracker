#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_URL="${APP_URL:-http://127.0.0.1:3000}"

FREE_EMAIL="${FREE_EMAIL:-verify-free@local.test}"
FREE_PASSWORD="${FREE_PASSWORD:-TestPass!234}"
PREMIUM_EMAIL="${PREMIUM_EMAIL:-verify-premium@local.test}"
PREMIUM_PASSWORD="${PREMIUM_PASSWORD:-TestPass!234}"
ADMIN_EMAIL="${ADMIN_EMAIL:-root@local.admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Harsh@2017}"

GUEST_COOKIE="/tmp/luffy-guest.cookies"
FREE_COOKIE="/tmp/luffy-free.cookies"
PREMIUM_COOKIE="/tmp/luffy-premium.cookies"
ADMIN_COOKIE="/tmp/luffy-admin.cookies"

rm -f "$GUEST_COOKIE" "$FREE_COOKIE" "$PREMIUM_COOKIE" "$ADMIN_COOKIE"

pass() {
  echo "[PASS] $1"
}

fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

write_json() {
  local method="$1"
  local url="$2"
  local cookie_jar="$3"
  local body_file="$4"
  shift 4
  local status
  status=$(curl -sS -o "$body_file" -w "%{http_code}" -X "$method" \
    -H "Accept: application/json" \
    -b "$cookie_jar" -c "$cookie_jar" \
    "$url" "$@")
  printf '%s' "$status"
}

login_json() {
  local email="$1"
  local password="$2"
  local cookie_jar="$3"
  local body_file
  body_file="$(mktemp)"
  local status
  status=$(curl -sS -o "$body_file" -w "%{http_code}" \
    -H "Accept: application/json" \
    -b "$cookie_jar" -c "$cookie_jar" \
    -F "email=${email}" \
    -F "password=${password}" \
    -F "next=/dashboard" \
    "${APP_URL}/api/auth/login")
  if [[ "$status" != "200" ]]; then
    cat "$body_file" >&2
    fail "Login failed for ${email} with status ${status}"
  fi
  BODY_FILE="$body_file" node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.env.BODY_FILE, "utf8"));
    if (!body.ok) {
      console.error(body);
      process.exit(1);
    }
  ' || fail "Login envelope invalid for ${email}"
  rm -f "$body_file"
}

assert_signal_role() {
  local body_file="$1"
  local mode="$2"
  BODY_FILE="$body_file" MODE="$mode" node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.env.BODY_FILE, "utf8"));
    if (!Array.isArray(body.items) || body.items.length === 0) {
      console.error("No signal items returned");
      process.exit(1);
    }
    const item = body.items[0];
    const mode = process.env.MODE;
    if (mode === "guest") {
      if (item.isPremiumLocked !== true) throw new Error("guest item should be premium locked");
      if ("entry" in item || "stopLoss" in item || "targets" in item) throw new Error("guest item leaked premium fields");
      if ("sourceStrategy" in item || "moderationState" in item) throw new Error("guest item leaked admin fields");
      process.exit(0);
    }
    if (mode === "free") {
      if (item.isPremiumLocked !== true) throw new Error("free item should be premium locked");
      if ("entry" in item || "stopLoss" in item || "targets" in item) throw new Error("free item leaked premium fields");
      if ("sourceStrategy" in item || "moderationState" in item) throw new Error("free item leaked admin fields");
      process.exit(0);
    }
    if (mode === "premium") {
      if (item.isPremiumLocked !== false) throw new Error("premium item should be unlocked");
      if (!item.entry || !item.stopLoss || !item.targets) throw new Error("premium item missing trade plan fields");
      if ("sourceStrategy" in item || "moderationState" in item) throw new Error("premium item leaked admin fields");
      process.exit(0);
    }
    if (mode === "admin") {
      if (!("sourceStrategy" in item) || !("moderationState" in item)) {
        throw new Error("admin item missing admin fields");
      }
      process.exit(0);
    }
    throw new Error(`Unknown mode ${mode}`);
  ' || fail "Signal role assertion failed for ${mode}"
}

extract_first_signal_id() {
  local body_file="$1"
  BODY_FILE="$body_file" node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.env.BODY_FILE, "utf8"));
    const id = body?.items?.[0]?.id;
    if (!id) process.exit(1);
    process.stdout.write(String(id));
  '
}

assert_drawer_role() {
  local body_file="$1"
  local mode="$2"
  BODY_FILE="$body_file" MODE="$mode" node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.env.BODY_FILE, "utf8"));
    const mode = process.env.MODE;
    if (mode === "guest" || mode === "free") {
      if (body.tradePlan !== null) throw new Error(`${mode} tradePlan should be null`);
      if (body.adminDiagnostics !== null) throw new Error(`${mode} adminDiagnostics should be null`);
      process.exit(0);
    }
    if (mode === "premium") {
      if (!body.tradePlan || body.adminDiagnostics !== null) throw new Error("premium drawer shape invalid");
      process.exit(0);
    }
    if (mode === "admin") {
      if (!body.tradePlan || !body.adminDiagnostics) throw new Error("admin drawer missing diagnostics");
      process.exit(0);
    }
    throw new Error(`Unknown mode ${mode}`);
  ' || fail "Signal drawer assertion failed for ${mode}"
}

extract_member_id() {
  local body_file="$1"
  local email="$2"
  BODY_FILE="$body_file" TARGET_EMAIL="$email" node -e '
    const fs = require("fs");
    const payload = JSON.parse(fs.readFileSync(process.env.BODY_FILE, "utf8"));
    const rows = payload?.data?.rows;
    if (!Array.isArray(rows)) process.exit(1);
    const row = rows.find((item) => String(item.email || "").toLowerCase() === process.env.TARGET_EMAIL.toLowerCase());
    if (!row?.id) process.exit(1);
    process.stdout.write(String(row.id));
  '
}

assert_error_code() {
  local body_file="$1"
  local expected="$2"
  BODY_FILE="$body_file" EXPECTED="$expected" node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.env.BODY_FILE, "utf8"));
    if (body?.ok !== false || body?.error?.code !== process.env.EXPECTED) {
      console.error(body);
      process.exit(1);
    }
  ' || fail "Expected error code ${expected}"
}

guest_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals" "$GUEST_COOKIE" "$guest_body")
[[ "$status" == "200" ]] || fail "Guest /api/signals returned ${status}"
assert_signal_role "$guest_body" "guest"
signal_id="$(extract_first_signal_id "$guest_body")" || fail "Could not extract guest signal id"
drawer_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals/${signal_id}" "$GUEST_COOKIE" "$drawer_body")
[[ "$status" == "200" ]] || fail "Guest /api/signals/:id returned ${status}"
assert_drawer_role "$drawer_body" "guest"
status=$(curl -sS -I -o /dev/null -w "%{http_code}" "${APP_URL}/billing")
[[ "$status" == "307" ]] || fail "Guest /billing should redirect, got ${status}"
status=$(curl -sS -I -o /dev/null -w "%{http_code}" "${APP_URL}/admin/system")
[[ "$status" == "307" ]] || fail "Guest /admin/system should redirect, got ${status}"
admin_guest_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/admin/members" "$GUEST_COOKIE" "$admin_guest_body")
[[ "$status" == "401" ]] || fail "Guest /api/admin/members should be 401, got ${status}"
assert_error_code "$admin_guest_body" "UNAUTHENTICATED"
pass "guest"

login_json "$FREE_EMAIL" "$FREE_PASSWORD" "$FREE_COOKIE"
free_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals" "$FREE_COOKIE" "$free_body")
[[ "$status" == "200" ]] || fail "Free /api/signals returned ${status}"
assert_signal_role "$free_body" "free"
free_signal_id="$(extract_first_signal_id "$free_body")" || fail "Could not extract free signal id"
free_drawer="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals/${free_signal_id}" "$FREE_COOKIE" "$free_drawer")
[[ "$status" == "200" ]] || fail "Free /api/signals/:id returned ${status}"
assert_drawer_role "$free_drawer" "free"
free_admin_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/admin/members" "$FREE_COOKIE" "$free_admin_body")
[[ "$status" == "403" ]] || fail "Free /api/admin/members should be 403, got ${status}"
assert_error_code "$free_admin_body" "FORBIDDEN"
pass "free"

login_json "$PREMIUM_EMAIL" "$PREMIUM_PASSWORD" "$PREMIUM_COOKIE"
premium_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals" "$PREMIUM_COOKIE" "$premium_body")
[[ "$status" == "200" ]] || fail "Premium /api/signals returned ${status}"
assert_signal_role "$premium_body" "premium"
premium_signal_id="$(extract_first_signal_id "$premium_body")" || fail "Could not extract premium signal id"
premium_drawer="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals/${premium_signal_id}" "$PREMIUM_COOKIE" "$premium_drawer")
[[ "$status" == "200" ]] || fail "Premium /api/signals/:id returned ${status}"
assert_drawer_role "$premium_drawer" "premium"
premium_admin_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/admin/members" "$PREMIUM_COOKIE" "$premium_admin_body")
[[ "$status" == "403" ]] || fail "Premium /api/admin/members should be 403, got ${status}"
assert_error_code "$premium_admin_body" "FORBIDDEN"
pass "premium"

login_json "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_COOKIE"
status=$(curl -sS -I -o /dev/null -w "%{http_code}" -b "$ADMIN_COOKIE" -c "$ADMIN_COOKIE" "${APP_URL}/admin/system")
[[ "$status" == "200" ]] || fail "Admin /admin/system should be 200, got ${status}"
admin_members_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/admin/members?limit=100" "$ADMIN_COOKIE" "$admin_members_body")
[[ "$status" == "200" ]] || fail "Admin /api/admin/members returned ${status}"
ADMIN_TARGET_ID="$(extract_member_id "$admin_members_body" "$ADMIN_EMAIL")" || fail "Could not find admin member row"
TEMP_ADMIN_ID="$(extract_member_id "$admin_members_body" "$PREMIUM_EMAIL")" || fail "Could not find premium member row"

promote_body="$(mktemp)"
status=$(write_json PATCH "${APP_URL}/api/admin/members/${TEMP_ADMIN_ID}" "$ADMIN_COOKIE" "$promote_body" \
  -H "Content-Type: application/json" \
  --data '{"role":"ADMIN","reason":"Smoke test temporary elevation"}')
[[ "$status" == "200" ]] || fail "Promoting temp admin failed with ${status}"

demote_temp_body="$(mktemp)"
status=$(write_json PATCH "${APP_URL}/api/admin/members/${TEMP_ADMIN_ID}" "$ADMIN_COOKIE" "$demote_temp_body" \
  -H "Content-Type: application/json" \
  --data '{"role":"MEMBER","reason":"Smoke test allowed demotion"}')
[[ "$status" == "200" ]] || fail "Allowed demotion failed with ${status}"

block_last_admin_body="$(mktemp)"
status=$(write_json PATCH "${APP_URL}/api/admin/members/${ADMIN_TARGET_ID}" "$ADMIN_COOKIE" "$block_last_admin_body" \
  -H "Content-Type: application/json" \
  --data '{"role":"MEMBER","reason":"Smoke test last-admin protection"}')
[[ "$status" == "409" ]] || fail "Last-admin protection should return 409, got ${status}"
assert_error_code "$block_last_admin_body" "LAST_ADMIN_PROTECTION"

admin_signal_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals" "$ADMIN_COOKIE" "$admin_signal_body")
[[ "$status" == "200" ]] || fail "Admin /api/signals returned ${status}"
assert_signal_role "$admin_signal_body" "admin"
admin_signal_id="$(extract_first_signal_id "$admin_signal_body")" || fail "Could not extract admin signal id"
admin_signal_drawer="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/signals/${admin_signal_id}" "$ADMIN_COOKIE" "$admin_signal_drawer")
[[ "$status" == "200" ]] || fail "Admin /api/signals/:id returned ${status}"
assert_drawer_role "$admin_signal_drawer" "admin"
pass "admin"

logout_body="$(mktemp)"
status=$(write_json POST "${APP_URL}/api/auth/logout" "$ADMIN_COOKIE" "$logout_body")
[[ "$status" == "200" ]] || fail "Logout returned ${status}"
post_logout_body="$(mktemp)"
status=$(write_json GET "${APP_URL}/api/admin/members" "$ADMIN_COOKIE" "$post_logout_body")
[[ "$status" == "401" ]] || fail "Post-logout admin route should be 401, got ${status}"
assert_error_code "$post_logout_body" "UNAUTHENTICATED"
pass "logout"

echo "[PASS] smoke-auth-roles complete"
