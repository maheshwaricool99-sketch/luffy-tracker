import { memo } from "react";
import type { AdminSignalListItemDto } from "@/lib/signals/types/signalDtos";
import { VirtualWindowList } from "@/components/primitives/VirtualWindowList";

const ROW_HEIGHT = 92;

const AdminSignalRow = memo(function AdminSignalRow({ item }: { item: AdminSignalListItemDto }) {
  return (
    <div className="mb-2 rounded-2xl border border-white/[0.06] bg-[#0F1D31] px-4 py-4 text-[13px] text-[#A7B4C8]">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-[#F3F7FF]">{item.symbol}</div>
        <div>{item.visibility}</div>
      </div>
      <div className="mt-2">{item.sourceStrategy} · {item.moderationState.published ? "Published" : item.moderationState.unpublished ? "Unpublished" : "Review"}</div>
    </div>
  );
});

function AdminSignalsTableComponent({ items }: { items: AdminSignalListItemDto[] }) {
  return (
    <VirtualWindowList
      className="max-h-[32rem] overflow-y-auto"
      estimateHeight={ROW_HEIGHT}
      items={items}
      renderItem={(item) => <AdminSignalRow key={item.id} item={item} />}
    />
  );
}

export const AdminSignalsTable = memo(AdminSignalsTableComponent);
