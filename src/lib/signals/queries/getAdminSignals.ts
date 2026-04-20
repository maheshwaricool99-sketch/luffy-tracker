import { listSignals } from "./listSignals";
import type { SignalListFilters } from "../types/signalFilters";

export async function getAdminSignals(filters: SignalListFilters, userId?: string | null) {
  return listSignals(filters, "ADMIN", userId);
}
