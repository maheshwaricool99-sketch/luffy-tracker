import Link from "next/link";

export default function AnalysisSymbolNotFound() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface-glass)] p-6">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Analysis</p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">Symbol not supported</h1>
      <p className="mt-3 text-sm text-[var(--text-soft)]">
        Use a supported symbol like <span className="font-medium text-[var(--text-strong)]">BTCUSDT</span>,{" "}
        <span className="font-medium text-[var(--text-strong)]">AAPL</span>, or{" "}
        <span className="font-medium text-[var(--text-strong)]">RELIANCE</span>.
      </p>
      <Link
        href="/analysis/BTCUSDT?timeframe=1H"
        className="mt-5 inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] px-4 text-sm font-medium text-[var(--text-strong)]"
      >
        Open BTCUSDT analysis
      </Link>
    </section>
  );
}
