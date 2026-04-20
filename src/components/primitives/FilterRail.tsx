import type { ReactNode } from "react";
import { Panel } from "./Panel";

export function FilterRail({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <Panel title={title} className={className} bodyClassName="space-y-4 p-4">{children}</Panel>;
}
