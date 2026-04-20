export const dynamic = "force-dynamic";

import { getViewer } from "@/lib/auth";
import { getIntelligencePagePayload } from "@/lib/intelligence/adapter";
import { IntelligencePageClient } from "@/components/intelligence/IntelligencePageClient";

export default async function IntelligencePage() {
  const viewer = await getViewer();

  let initialData;
  try {
    initialData = await getIntelligencePagePayload(viewer);
  } catch {
    initialData = undefined;
  }

  return (
    <div className="-m-5">
      <IntelligencePageClient initialData={initialData} />
    </div>
  );
}
