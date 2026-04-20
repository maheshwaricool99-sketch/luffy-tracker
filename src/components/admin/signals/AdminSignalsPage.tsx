import type { AdminSignalListItemDto } from "@/lib/signals/types/signalDtos";
import { AdminSignalsToolbar } from "./AdminSignalsToolbar";
import { AdminSignalsTable } from "./AdminSignalsTable";

export function AdminSignalsPage({ items }: { items: AdminSignalListItemDto[] }) {
  return (
    <div className="space-y-4">
      <AdminSignalsToolbar />
      <AdminSignalsTable items={items} />
    </div>
  );
}
