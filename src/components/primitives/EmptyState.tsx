export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
      <div className="text-[15px] font-semibold text-[#F3F7FF]">{title}</div>
      <p className="mt-2 max-w-md text-[13px] font-medium leading-[18px] text-[#70809A]">{description}</p>
    </div>
  );
}
