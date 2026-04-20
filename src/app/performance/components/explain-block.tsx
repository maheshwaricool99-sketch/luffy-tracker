export function ExplainBlock() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[28px] border border-white/10 bg-[#091321] p-5">
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">How This System Generates Results</div>
        <div className="mt-4 space-y-3 text-[14px] leading-7 text-[#9CB0C7]">
          <p>Multi-strategy confirmation reduces one-model false positives.</p>
          <p>Macro regime filtering prevents forced entries into weak market structure.</p>
          <p>Risk-reward normalization keeps outcomes comparable across markets.</p>
          <p>Strict entry and exit discipline limits drift between signal intent and reported performance.</p>
          <p>Controlled concurrency prevents overtrading from contaminating quality.</p>
        </div>
      </article>
      <article className="rounded-[28px] border border-white/10 bg-[#091321] p-5">
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">Data Integrity</div>
        <div className="mt-4 space-y-3 text-[14px] leading-7 text-[#9CB0C7]">
          <p>No backtesting is shown on this page.</p>
          <p>Only finalized tracked outcomes are included in headline performance.</p>
          <p>Losing trades remain visible and are not filtered out of reported analytics.</p>
          <p>No misleading zero placeholders are shown when finalized history is unavailable.</p>
          <p>Source freshness is normalized to Live Engine, Synced Snapshot, or Delayed Feed.</p>
        </div>
      </article>
    </section>
  );
}
