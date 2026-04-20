import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScannerPersistenceSnapshot } from "./types";

const SNAPSHOT_DIR = path.join(process.cwd(), ".runtime");
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, "scanner-snapshot.json");
const SCHEMA_VERSION = 1;

export async function readScannerPersistenceSnapshot(): Promise<ScannerPersistenceSnapshot | null> {
  try {
    const raw = await readFile(SNAPSHOT_FILE, "utf8");
    const parsed = JSON.parse(raw) as ScannerPersistenceSnapshot;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeScannerPersistenceSnapshot(snapshot: Omit<ScannerPersistenceSnapshot, "schemaVersion" | "savedAt">) {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  const payload: ScannerPersistenceSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: Date.now(),
    scanner: snapshot.scanner,
    publishedSignals: snapshot.publishedSignals,
  };
  await writeFile(SNAPSHOT_FILE, JSON.stringify(payload, null, 2), "utf8");
}
