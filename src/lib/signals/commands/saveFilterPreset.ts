import { randomUUID } from "node:crypto";
import { getDb, nowIso } from "@/lib/db";
import { assertWritableOrThrow, runtimeConfig } from "@/lib/runtime";

export async function saveFilterPreset(userId: string, name: string, filterConfig: Record<string, unknown>, isDefault = false) {
  assertWritableOrThrow((await runtimeConfig.getAll()).flags);
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO saved_filter_presets_v2 (id, user_id, name, filter_config_json, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, name, JSON.stringify(filterConfig), isDefault ? 1 : 0, nowIso(), nowIso());
  return { id, name, filterConfig, isDefault };
}
