import fs from "node:fs";
import path from "node:path";

const RUNTIME_DIR = path.join(process.cwd(), ".runtime");
const AUDIT_DIR = path.join(RUNTIME_DIR, "audit");

function ensureAuditDir() {
  if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

function dayStamp(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function appendJsonLine(filePath: string, payload: unknown) {
  try {
    ensureAuditDir();
    fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // Audit should never crash engine execution.
  }
}

function latestJsonlFiles(prefix: string) {
  try {
    ensureAuditDir();
    const files = fs
      .readdirSync(AUDIT_DIR)
      .filter((name: string) => name.startsWith(prefix) && name.endsWith(".jsonl"))
      .sort((a: string, b: string) => b.localeCompare(a));
    return files.map((name: string) => path.join(AUDIT_DIR, name));
  } catch {
    return [];
  }
}

export function writeJsonAtomic(filePath: string, payload: unknown) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload), "utf8");
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch {
    return false;
  }
}

export function readLatestSnapshotAudit<T>(engine: "tracker" | "luffy" | "luffy-lite"): T | null {
  const files = latestJsonlFiles(`${engine}-snapshots-`);
  for (const file of files) {
    try {
      const lines = fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const parsed = JSON.parse(lines[i]) as { snapshot?: unknown };
        if (parsed && typeof parsed === "object" && "snapshot" in parsed) {
          return parsed.snapshot as T;
        }
      }
    } catch {
      // try previous file
    }
  }
  return null;
}

export function appendTradeAudit(engine: "tracker" | "luffy" | "luffy-lite", event: Record<string, unknown>, ts = Date.now()) {
  const file = path.join(AUDIT_DIR, `${engine}-trades-${dayStamp(ts)}.jsonl`);
  appendJsonLine(file, { ts, engine, ...event });
}

export function appendSnapshotAudit(engine: "tracker" | "luffy" | "luffy-lite", snapshot: unknown, ts = Date.now()) {
  const file = path.join(AUDIT_DIR, `${engine}-snapshots-${dayStamp(ts)}.jsonl`);
  appendJsonLine(file, { ts, engine, snapshot });
}
