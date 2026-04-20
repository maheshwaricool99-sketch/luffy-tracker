import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const DB_PATH = process.env.APP_DB_PATH || join(process.cwd(), "data", "terminal.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __terminalDb: DatabaseSync | undefined;
}

function bootstrap(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      account_status TEXT NOT NULL DEFAULT 'ACTIVE',
      name TEXT,
      email_verified_at TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'FREE',
      status TEXT NOT NULL DEFAULT 'inactive',
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT UNIQUE,
      entitlements_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watchlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      symbols_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      symbol TEXT,
      type TEXT NOT NULL,
      config_json TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      notifications_json TEXT NOT NULL DEFAULT '{}',
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      audience TEXT NOT NULL DEFAULT 'all',
      updated_by TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_flags (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      value_json TEXT,
      description TEXT,
      updated_by_user_id TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS runtime_flag_audit_logs (
      id TEXT PRIMARY KEY,
      flag_key TEXT NOT NULL,
      old_enabled INTEGER,
      new_enabled INTEGER,
      old_value_json TEXT,
      new_value_json TEXT,
      changed_by_user_id TEXT,
      changed_by_email TEXT,
      reason TEXT,
      source TEXT NOT NULL,
      request_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_flag_events (
      id TEXT PRIMARY KEY,
      flag_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_market_controls (
      market TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      publish_freeze INTEGER NOT NULL DEFAULT 0,
      stale_threshold_ms INTEGER NOT NULL DEFAULT 300000,
      degraded_mode INTEGER NOT NULL DEFAULT 0,
      suppression_rules_json TEXT NOT NULL DEFAULT '[]',
      warmup_behavior TEXT NOT NULL DEFAULT 'normal',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_model_controls (
      model TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      threshold REAL NOT NULL DEFAULT 70,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_incidents (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      acknowledged_by TEXT,
      resolved_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      target_user_id TEXT,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      before_json TEXT NOT NULL,
      after_json TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS signal_records (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      direction TEXT NOT NULL,
      class TEXT NOT NULL,
      confidence REAL NOT NULL,
      entry_value REAL NOT NULL,
      stop_value REAL NOT NULL,
      target_value REAL NOT NULL,
      expected_r REAL NOT NULL,
      freshness TEXT NOT NULL,
      source_state TEXT NOT NULL,
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      thesis TEXT,
      rationale_json TEXT,
      supporting_factors_json TEXT,
      invalidation_rules_json TEXT,
      lifecycle_state TEXT NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS signal_records_market_published_at_idx ON signal_records(market, published_at DESC);
    CREATE INDEX IF NOT EXISTS signal_records_published_at_idx ON signal_records(published_at DESC);
    CREATE INDEX IF NOT EXISTS signal_records_freshness_published_at_idx ON signal_records(freshness, published_at DESC);
    CREATE INDEX IF NOT EXISTS signal_records_symbol_idx ON signal_records(symbol);

    CREATE TABLE IF NOT EXISTS market_health (
      market TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      freshness TEXT NOT NULL,
      source_state TEXT NOT NULL,
      last_updated_at TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signal_events (
      id TEXT PRIMARY KEY,
      signal_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_at TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      actor_type TEXT NOT NULL DEFAULT 'SYSTEM',
      actor_user_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS signal_events_signal_id_event_at_idx ON signal_events(signal_id, event_at DESC);

    CREATE TABLE IF NOT EXISTS signal_watchlist_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      signal_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, signal_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS signal_watchlist_items_user_signal_idx ON signal_watchlist_items(user_id, signal_id);

    CREATE TABLE IF NOT EXISTS signal_alert_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      signal_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS signal_alert_rules_user_enabled_idx ON signal_alert_rules(user_id, is_enabled);

    CREATE TABLE IF NOT EXISTS engine_audit_events (
      id TEXT PRIMARY KEY,
      engine TEXT NOT NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      actor_user_id TEXT,
      actor_email TEXT,
      actor_role TEXT,
      reason TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS engine_audit_events_engine_created_idx ON engine_audit_events(engine, created_at DESC);
    CREATE INDEX IF NOT EXISTS engine_audit_events_action_created_idx ON engine_audit_events(action, created_at DESC);

    CREATE TABLE IF NOT EXISTS engine_runtime_state (
      engine TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      mode TEXT,
      reason_code TEXT,
      reason TEXT,
      last_heartbeat_at TEXT,
      last_healthy_at TEXT,
      last_restart_at TEXT,
      last_restart_by TEXT,
      last_config_change_at TEXT,
      last_config_change_by TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS member_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      author_user_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS member_notes_user_idx ON member_notes(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS saved_filter_presets_v2 (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      filter_config_json TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec("ALTER TABLE users ADD COLUMN username TEXT");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'ACTIVE'");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT");
  } catch {}

  const now = new Date().toISOString();
  for (const market of ["crypto", "us", "india"]) {
    db.prepare(`
      INSERT INTO admin_market_controls (
        market, enabled, publish_freeze, stale_threshold_ms, degraded_mode, suppression_rules_json, warmup_behavior, updated_at
      ) VALUES (?, 1, 0, 300000, 0, '[]', 'normal', ?)
      ON CONFLICT(market) DO NOTHING
    `).run(market, now);
  }

  for (const model of [
    "continuation_model",
    "breakout_model",
    "reversal_model",
    "high_confidence_filter",
    "early_detection_filter",
  ]) {
    db.prepare(`
      INSERT INTO admin_model_controls (model, enabled, threshold, updated_at)
      VALUES (?, 1, 70, ?)
      ON CONFLICT(model) DO NOTHING
    `).run(model, now);
  }

  for (const [key, enabled, description] of [
    ["maintenance_mode", 0, "Global operational shutdown mode with admin override access."],
    ["read_only_mode", 0, "Blocks non-essential write operations while reads continue."],
    ["disable_signup", 0, "Prevents new account creation across signup flows."],
    ["pause_signal_publishing", 0, "Stops new signal publication while scanning may continue."],
    ["pause_scanners", 0, "Pauses scanner loops and market polling workers."],
    ["freeze_upgrades", 0, "Disables checkout and premium upgrade flows."],
    ["pause_experiments", 0, "Forces stable production variants and disables experiments."],
  ] as const) {
    db.prepare(`
      INSERT INTO runtime_flags (
        id, key, enabled, value_json, description, updated_by_user_id, updated_at, created_at, version
      ) VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, 1)
      ON CONFLICT(key) DO NOTHING
    `).run(randomUUID(), key, enabled, description, now, now);
  }

  ensureBootstrapAdmin(db, now);
}

function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function ensureBootstrapAdmin(db: DatabaseSync, now: string) {
  const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get("root", "root@local.admin") as { id?: string } | undefined;
  if (existing?.id) return;

  const userId = randomUUID();
  db.prepare(`
    INSERT INTO users (
      id, email, username, password_hash, role, account_status, name, email_verified_at, last_login_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?, ?, ?, ?)
  `).run(
    userId,
    "root@local.admin",
    "root",
    passwordHash("Harsh@2017"),
    "root",
    now,
    now,
    now,
    now,
  );

  db.prepare(`
    INSERT INTO subscriptions (id, user_id, plan, status, entitlements_json, created_at, updated_at)
    VALUES (?, ?, 'FREE', 'active', ?, ?, ?)
  `).run(randomUUID(), userId, JSON.stringify({ adminOverride: true }), now, now);

  db.prepare(`
    INSERT INTO user_settings (user_id, notifications_json, profile_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, JSON.stringify({ emailSignals: true, realtimeInApp: true, digest: true }), JSON.stringify({}), now, now);
}

export function getDb() {
  if (!global.__terminalDb) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    global.__terminalDb = new DatabaseSync(DB_PATH);
    bootstrap(global.__terminalDb);
  }

  return global.__terminalDb;
}

export function nowIso() {
  return new Date().toISOString();
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
