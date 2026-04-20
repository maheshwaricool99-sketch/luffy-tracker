import { getAllProviderManagers } from "./provider-manager";

export async function forceProviderRecoveryCycle() {
  await Promise.all(getAllProviderManagers().map((manager) => manager.ensureHealthy()));
}
