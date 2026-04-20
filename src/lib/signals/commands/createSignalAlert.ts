import { randomUUID } from "node:crypto";
import { getDb, nowIso } from "@/lib/db";
import { assertWritableOrThrow, runtimeConfig } from "@/lib/runtime";

export async function createSignalAlert(userId: string, signalId: string, channel: string, triggerType: string) {
  assertWritableOrThrow((await runtimeConfig.getAll()).flags);
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO signal_alert_rules (id, user_id, signal_id, channel, trigger_type, is_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, userId, signalId, channel, triggerType, nowIso(), nowIso());
  return {
    ok: true,
    alert: {
      id,
      channel,
      triggerType,
      isEnabled: true,
    },
  };
}
