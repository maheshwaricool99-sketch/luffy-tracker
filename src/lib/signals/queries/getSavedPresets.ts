import { getDb, parseJson } from "@/lib/db";

export async function getSavedPresets(userId: string) {
  const rows = getDb().prepare("SELECT * FROM saved_filter_presets_v2 WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    filterConfig: parseJson<Record<string, unknown>>(row.filter_config_json, {}),
    isDefault: Boolean(row.is_default),
  }));
}
