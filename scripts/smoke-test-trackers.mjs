#!/usr/bin/env node
/**
 * smoke-test-trackers.mjs
 *
 * Smoke-tests all 5 trackers by polling their API endpoints.
 * Verifies that each tracker:
 *   1. Is reachable (HTTP 200)
 *   2. Has lastScanMs advancing (proves ticker is alive)
 *   3. Has openPairs > 0 OR lastOrderMs > 0 (proves orders are being attempted)
 *   4. Reports trackerHealthy === true OR history is growing
 *
 * Usage:
 *   node scripts/smoke-test-trackers.mjs
 *   node scripts/smoke-test-trackers.mjs --cycles 8 --interval 15
 *
 * Options:
 *   --host     Base URL (default: http://localhost:3000)
 *   --cycles   Number of poll cycles (default: 5)
 *   --interval Seconds between cycles (default: 30)
 */

const args = process.argv.slice(2);
function arg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : defaultVal;
}

const BASE = arg("host", "http://localhost:3000");
const CYCLES = parseInt(arg("cycles", "5"), 10);
const INTERVAL_S = parseInt(arg("interval", "30"), 10);

const TRACKERS = [
  { name: "advanced",   url: `${BASE}/api/tracker-engine?level=advanced` },
  { name: "expert",     url: `${BASE}/api/tracker-engine?level=expert` },
  { name: "ace",        url: `${BASE}/api/tracker-engine?level=ace` },
  { name: "luffy-lite", url: `${BASE}/api/luffy-lite-engine` },
  { name: "luffy",      url: `${BASE}/api/luffy-engine` },
];

// Per-tracker state across cycles
const trackerState = {};
for (const t of TRACKERS) {
  trackerState[t.name] = {
    firstScanMs: null,
    lastScanMs: null,
    firstOrderMs: null,
    lastOrderMs: null,
    firstHistoryLen: null,
    lastHistoryLen: null,
    firstOpenPairs: null,
    lastOpenPairs: null,
    scanAdvanced: false,
    ordersAttempted: false,
    healthy: false,
    errors: [],
    httpErrors: 0,
  };
}

async function poll(tracker) {
  const s = trackerState[tracker.name];
  let data;
  try {
    const res = await fetch(tracker.url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      s.httpErrors++;
      s.errors.push(`HTTP ${res.status}`);
      return;
    }
    data = await res.json();
  } catch (err) {
    s.httpErrors++;
    s.errors.push(String(err).slice(0, 80));
    return;
  }

  const scanMs = data.lastScanMs ?? 0;
  const orderMs = data.lastOrderMs ?? 0;
  const histLen = Array.isArray(data.history) ? data.history.length : 0;
  const openPairs = data.openPairs ?? 0;
  const healthy = data.trackerHealthy ?? false;

  if (s.firstScanMs === null && scanMs > 0) s.firstScanMs = scanMs;
  if (s.firstOrderMs === null && orderMs > 0) s.firstOrderMs = orderMs;
  if (s.firstHistoryLen === null) s.firstHistoryLen = histLen;
  if (s.firstOpenPairs === null) s.firstOpenPairs = openPairs;

  if (s.lastScanMs !== null && scanMs > s.lastScanMs) s.scanAdvanced = true;
  if (orderMs > 0 || openPairs > 0) s.ordersAttempted = true;
  if (healthy) s.healthy = true;

  s.lastScanMs = scanMs;
  s.lastOrderMs = orderMs;
  s.lastHistoryLen = histLen;
  s.lastOpenPairs = openPairs;

  return data;
}

function fmt(ms) {
  if (!ms || ms <= 0) return "never";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

async function runCycles() {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║       LUFFY TRACKER SMOKE TEST — ${CYCLES} cycles × ${INTERVAL_S}s      ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
  console.log(`  Base URL : ${BASE}`);
  console.log(`  Trackers : ${TRACKERS.map(t => t.name).join(", ")}\n`);

  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    console.log(`\n── Cycle ${cycle}/${CYCLES} ──────────────────────────────────────────`);
    const results = await Promise.all(TRACKERS.map(t => poll(t)));

    for (let i = 0; i < TRACKERS.length; i++) {
      const t = TRACKERS[i];
      const s = trackerState[t.name];
      const d = results[i];
      if (!d) {
        console.log(`  [${t.name.padEnd(10)}] ✗ HTTP error (${s.httpErrors} total)`);
        continue;
      }
      const scanAge = d.lastScanMs > 0 ? Math.round((Date.now() - d.lastScanMs) / 1000) : "?";
      const orderAge = d.lastOrderMs > 0 ? Math.round((Date.now() - d.lastOrderMs) / 1000) : "never";
      const scanAdvStr = s.scanAdvanced ? "✓ advancing" : "- not yet";
      console.log(
        `  [${t.name.padEnd(10)}] ` +
        `scan=${scanAge}s ago | order=${orderAge}s ago | ` +
        `openPairs=${d.openPairs ?? 0} | history=${s.lastHistoryLen ?? 0} | ` +
        `scanAdv=${scanAdvStr} | healthy=${d.trackerHealthy ?? false}`
      );
      if (d.lastError) {
        console.log(`               lastError: ${String(d.lastError).slice(0, 120)}`);
      }
    }

    if (cycle < CYCLES) {
      process.stdout.write(`\n  Waiting ${INTERVAL_S}s...`);
      await new Promise(r => setTimeout(r, INTERVAL_S * 1000));
      process.stdout.write(" done\n");
    }
  }

  // Final report
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║                   FINAL REPORT                          ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);

  let allPass = true;
  for (const t of TRACKERS) {
    const s = trackerState[t.name];
    const checks = {
      reachable:        s.httpErrors < CYCLES,         // at least one success
      scanAdvancing:    s.scanAdvanced,                  // lastScanMs changed
      ordersAttempted:  s.ordersAttempted,               // openPairs > 0 OR lastOrderMs > 0
      healthy:          s.healthy || s.ordersAttempted, // trackerHealthy OR orders
    };
    const pass = Object.values(checks).every(Boolean);
    if (!pass) allPass = false;

    const statusIcon = pass ? "✓ PASS" : "✗ FAIL";
    console.log(`\n  ${statusIcon}  ${t.name}`);
    console.log(`    reachable:       ${checks.reachable ? "✓" : "✗"} (httpErrors=${s.httpErrors})`);
    console.log(`    scanAdvancing:   ${checks.scanAdvancing ? "✓" : "✗"} (lastScanMs=${fmt(s.lastScanMs)})`);
    console.log(`    ordersAttempted: ${checks.ordersAttempted ? "✓" : "✗"} (openPairs=${s.lastOpenPairs} lastOrderMs=${fmt(s.lastOrderMs)})`);
    console.log(`    healthy:         ${checks.healthy ? "✓" : "✗"}`);
    if (s.errors.length > 0) {
      console.log(`    errors: ${s.errors.slice(-3).join(" | ")}`);
    }
  }

  console.log(`\n  Overall: ${allPass ? "✓ ALL TRACKERS PASS" : "✗ SOME TRACKERS FAILED"}`);
  console.log("");
  process.exit(allPass ? 0 : 1);
}

runCycles().catch(err => {
  console.error("Smoke test crashed:", err);
  process.exit(2);
});
