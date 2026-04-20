import type { HealthBanner } from "@/lib/health/health-types";

const SEVERITY_CLASSES = {
  info: "border-blue-500/20 bg-blue-500/[0.06] text-blue-300",
  warning: "border-amber-500/20 bg-amber-500/[0.06] text-amber-300",
  critical: "border-rose-500/20 bg-rose-500/[0.06] text-rose-300",
};

const SEVERITY_ICONS = {
  info: "ℹ",
  warning: "⚠",
  critical: "✕",
};

export function HealthBannerCard({ banner }: { banner: HealthBanner }) {
  const classes = SEVERITY_CLASSES[banner.severity];
  const icon = SEVERITY_ICONS[banner.severity];

  return (
    <div className={`rounded-2xl border p-5 md:p-6 ${classes}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg leading-none flex-shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[15px]">{banner.title}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <BannerSection title="What happened" items={banner.whatHappened} />
            <BannerSection title="Expected impact" items={banner.impact} />
            <BannerSection title="Recovery" items={banner.recovery} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.1em] opacity-60">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[13px] opacity-80">
            <span className="mt-0.5 text-[10px] flex-shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
