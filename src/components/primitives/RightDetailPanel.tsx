import type { ReactNode } from "react";
import { Panel } from "./Panel";

export function RightDetailPanel({ title, subtitle, children, className, bodyClassName }: { title: string; subtitle?: string; children: ReactNode; className?: string; bodyClassName?: string }) {
  return <Panel title={title} subtitle={subtitle} className={className} bodyClassName={bodyClassName ?? "space-y-4 p-4"}>{children}</Panel>;
}
