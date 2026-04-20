import { getScannerHealthSnapshot } from "./provider-health";

export function getScannerHealth() {
  const snapshot = getScannerHealthSnapshot();
  return {
    degraded: snapshot.degraded,
    scanner: snapshot.markets,
    providers: snapshot.providers,
    snapshotRestoreActive: snapshot.snapshotRestoreActive,
  };
}
