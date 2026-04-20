"use client";

import type { ReactNode } from "react";
import type { Viewer } from "@/lib/entitlements";
import { MobileNavProvider } from "./MobileNavContext";
import { MobileDrawerNav } from "./MobileDrawerNav";

interface ClientShellProps {
  viewer: Viewer | null;
  children: ReactNode;
}

export function ClientShell({ viewer, children }: ClientShellProps) {
  return (
    <MobileNavProvider>
      <MobileDrawerNav viewer={viewer} />
      {children}
    </MobileNavProvider>
  );
}
