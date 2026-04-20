"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPage, AdminHeader } from "@/components/admin/admin-ui";
import type { EngineActionResult, EngineAuditEvent, EngineStatusResponse } from "@/server/engines/engine-types";
import { EngineControlOverview } from "./EngineControlOverview";
import { PriceEngineCard } from "./PriceEngineCard";
import { ExecutionEngineCard } from "./ExecutionEngineCard";
import { ConfirmEngineActionDialog, type ConfirmSpec } from "./ConfirmEngineActionDialog";

type ToastState = { tone: "ok" | "err"; text: string } | null;

type PendingAction = {
  engine: "price" | "execution";
  action: string;
  payload?: Record<string, unknown>;
  spec: ConfirmSpec | null;
};

const PRICE_CONFIRMS: Record<string, ConfirmSpec | null> = {
  restart: {
    title: "Restart Price Engine?",
    body: "This will reset all provider connections and may briefly interrupt market data. Signals in flight may be delayed.",
    confirmLabel: "Restart",
    tone: "danger",
    typedConfirm: "RESTART",
  },
  reconnect: null,
  reload_providers: null,
  flush_cache: {
    title: "Flush stale price cache?",
    body: "This clears cached prices and snapshot records. Next reads will hit providers directly.",
    confirmLabel: "Flush cache",
    tone: "danger",
  },
};

const EXECUTION_CONFIRMS: Record<string, ConfirmSpec | null> = {
  reload_config: null,
  restart: {
    title: "Restart Execution Service?",
    body: "This restarts the execution runtime shell. Current mode is preserved.",
    confirmLabel: "Restart",
    tone: "danger",
  },
  set_mode: {
    title: "Change execution mode?",
    body: "This changes how the execution layer behaves. Some modes require a server feature flag.",
    confirmLabel: "Change mode",
    tone: "danger",
    typedConfirm: "CONFIRM",
  },
};

export function EngineControlClient({
  initialStatus,
  initialPriceAudit,
  initialExecutionAudit,
}: {
  initialStatus: EngineStatusResponse;
  initialPriceAudit: EngineAuditEvent[];
  initialExecutionAudit: EngineAuditEvent[];
}) {
  const [status, setStatus] = useState<EngineStatusResponse>(initialStatus);
  const [priceAudit, setPriceAudit] = useState<EngineAuditEvent[]>(initialPriceAudit);
  const [executionAudit, setExecutionAudit] = useState<EngineAuditEvent[]>(initialExecutionAudit);
  const [pending, setPending] = useState<{ engine: string; action: string } | null>(null);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statusRes, priceRes, execRes] = await Promise.all([
        fetch("/api/admin/engines/status", { cache: "no-store" }),
        fetch("/api/admin/engines/audit?engine=price&limit=8", { cache: "no-store" }),
        fetch("/api/admin/engines/audit?engine=execution&limit=8", { cache: "no-store" }),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (priceRes.ok) setPriceAudit((await priceRes.json()).items ?? []);
      if (execRes.ok) setExecutionAudit((await execRes.json()).items ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => void refresh(), 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const runAction = useCallback(
    async (engine: "price" | "execution", action: string, reason: string, payload?: Record<string, unknown>) => {
      setPending({ engine, action });
      const path = engine === "price"
        ? `/api/admin/engines/price/${action.replace(/_/g, "-")}`
        : `/api/admin/engines/execution/${action.replace(/_/g, "-")}`;
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, ...payload }),
        });
        const json: EngineActionResult = await res.json();
        if (json.ok) {
          setToast({ tone: "ok", text: json.message });
        } else {
          setToast({ tone: "err", text: json.message });
        }
      } catch (err) {
        setToast({ tone: "err", text: `Request failed: ${(err as Error).message}` });
      } finally {
        setPending(null);
        void refresh();
      }
    },
    [refresh],
  );

  const onPriceAction = useCallback(
    (action: "restart" | "reconnect" | "reload_providers" | "flush_cache") => {
      const spec = PRICE_CONFIRMS[action];
      if (spec) {
        setConfirm({ engine: "price", action, spec });
      } else {
        void runAction("price", action, "");
      }
    },
    [runAction],
  );

  const onExecutionAction = useCallback(
    (action: "restart" | "reload_config" | "set_mode", payload?: { mode?: string }) => {
      const spec = EXECUTION_CONFIRMS[action];
      if (spec) {
        setConfirm({ engine: "execution", action, payload, spec });
      } else {
        void runAction("execution", action, "", payload);
      }
    },
    [runAction],
  );

  const pendingPrice = pending?.engine === "price" ? pending.action : null;
  const pendingExec = pending?.engine === "execution" ? pending.action : null;

  const badges = useMemo(
    () => [
      { label: `Overall: ${status.overall.status.replace(/_/g, " ")}`, tone: (status.overall.status === "operational" ? "green" : status.overall.status === "down" ? "red" : "yellow") as "green" | "red" | "yellow" },
    ],
    [status.overall.status],
  );

  return (
    <AdminPage>
      <AdminHeader
        title="Engine Control Center"
        description="Monitor and control price infrastructure and execution mode. All actions are audited."
        badges={badges}
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-[#F3F7FF] hover:bg-white/[0.07] disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      <EngineControlOverview data={status} />

      <div className="grid gap-4 xl:grid-cols-2">
        <PriceEngineCard
          status={status.priceEngine}
          audit={priceAudit}
          onAction={onPriceAction}
          pendingAction={pendingPrice}
        />
        <ExecutionEngineCard
          status={status.executionEngine}
          audit={executionAudit}
          onAction={onExecutionAction}
          pendingAction={pendingExec}
        />
      </div>

      <ConfirmEngineActionDialog
        open={confirm !== null}
        spec={confirm?.spec ?? null}
        pending={pending !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={(reason) => {
          if (!confirm) return;
          const { engine, action, payload } = confirm;
          setConfirm(null);
          void runAction(engine, action, reason, payload);
        }}
      />

      {toast ? (
        <div
          className={
            toast.tone === "ok"
              ? "fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-xl"
              : "fixed bottom-6 right-6 z-50 rounded-xl border border-rose-400/30 bg-rose-400/15 px-4 py-3 text-sm font-semibold text-rose-100 shadow-xl"
          }
        >
          {toast.text}
        </div>
      ) : null}
    </AdminPage>
  );
}
