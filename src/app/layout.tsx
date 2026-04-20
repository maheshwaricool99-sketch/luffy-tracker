import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { MaintenanceScreen } from "@/components/layout/MaintenanceScreen";
import { QueryProvider } from "@/lib/query/client";
import { canBypassMaintenanceForPath, runtimeConfig } from "@/lib/runtime";
import { getSessionUser } from "@/lib/auth/getSessionUser";

export const metadata: Metadata = {
  title: "Signal Intelligence Terminal",
  description: "Real-time multi-factor market intelligence and signal terminal",
};

async function shouldShowMaintenance(): Promise<boolean> {
  const { flags } = await runtimeConfig.getAll();
  if (!flags.maintenance_mode) return false;
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "/";
  const user = await getSessionUser();
  const role = user?.role ?? null;
  return !canBypassMaintenanceForPath(pathname, role);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const maintenance = await shouldShowMaintenance();

  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full">
        <div id="app">
          <QueryProvider>
            {maintenance ? <MaintenanceScreen /> : <AppShell>{children}</AppShell>}
          </QueryProvider>
        </div>
      </body>
    </html>
  );
}
