import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeDir = path.join(root, '.runtime');
const auditDir = path.join(runtimeDir, 'audit');
const eventsDir = path.join(runtimeDir, 'events');

fs.mkdirSync(runtimeDir, { recursive: true });

const now = Date.now();

// ── Clean tracker-engine state (3 levels: advanced, expert, ace) ─────────────
const cleanTracker = {
  version: 2,
  savedAtMs: now,
  states: [],
};

// ── Clean luffy-lite (and luffy alias) engine state ───────────────────────────
const cleanLuffy = {
  startedAtMs: now,
  lastScanMs: 0,
  lastOrderMs: 0,
  lastError: null,
  lastErrorAtMs: 0,
  marketTrendScore: 0,
  marketBias: 'neutral',
  scanIntervalMs: 15000,
  mode: 'normal',
  signals: [],
  orders: [],
  learning: {
    setupStats: {},
    repeats: {},
    priorPwin: 0.52,
  },
  macroContext: {
    regime: 'neutral',
    riskMode: 'normal',
    allowNewTrades: true,
    maxOpenTrades: 5,
    confidenceAdjustmentPct: 0,
    positionSizeMultiplier: 1,
    tensionIndex: 0,
    updatedAtMs: now,
  },
  processing: false,
  trackedPairs: 0,
  eligiblePairs: 0,
};

// ── Clean trade store (portfolio-trades.json) ─────────────────────────────────
// Format: { open: {}, closed: [], dailyStartUsd: 0, dayStamp: "" }
const cleanTradeStore = {
  open: {},
  closed: [],
  dailyStartUsd: 0,
  dayStamp: '',
};

// ── Clean portfolio-state.json ────────────────────────────────────────────────
// portfolioController rebuilds this on startup from tradeStore; writing empty
// prevents stale exposure readings if the process reads it before recalculation.
const cleanPortfolioState = [];

// ── Clean claim registry ──────────────────────────────────────────────────────
const cleanClaimRegistry = { pending: {}, recent: {}, cooldowns: {} };

// ── Write all files ───────────────────────────────────────────────────────────
fs.writeFileSync(path.join(runtimeDir, 'tracker-engine-state.json'),    JSON.stringify(cleanTracker,       null, 2));
fs.writeFileSync(path.join(runtimeDir, 'luffy-engine-state.json'),      JSON.stringify(cleanLuffy,         null, 2));
fs.writeFileSync(path.join(runtimeDir, 'luffy-lite-engine-state.json'), JSON.stringify({ ...cleanLuffy },  null, 2));
fs.writeFileSync(path.join(runtimeDir, 'portfolio-trades.json'),        JSON.stringify(cleanTradeStore,    null, 2));
fs.writeFileSync(path.join(runtimeDir, 'portfolio-state.json'),         JSON.stringify(cleanPortfolioState, null, 2));
fs.writeFileSync(path.join(runtimeDir, 'claim-registry.json'),          JSON.stringify(cleanClaimRegistry, null, 2));

// ── Clear audit logs ──────────────────────────────────────────────────────────
if (fs.existsSync(auditDir)) {
  for (const name of fs.readdirSync(auditDir)) {
    fs.rmSync(path.join(auditDir, name), { force: true, recursive: true });
  }
}

// ── Clear event logs ──────────────────────────────────────────────────────────
if (fs.existsSync(eventsDir)) {
  for (const name of fs.readdirSync(eventsDir)) {
    fs.rmSync(path.join(eventsDir, name), { force: true, recursive: true });
  }
}

console.log('Runtime state reset complete.');
console.log('  portfolio-trades.json  → cleared (0 open, 0 closed)');
console.log('  portfolio-state.json   → cleared');
console.log('  claim-registry.json    → cleared');
console.log('  tracker-engine-state   → cleared (3 levels)');
console.log('  luffy-lite-engine-state→ cleared');
console.log('  audit/                 → cleared');
console.log('  events/                → cleared');
