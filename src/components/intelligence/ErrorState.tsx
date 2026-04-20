interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-400/5 px-6 py-12 text-center">
      <div className="text-[28px] mb-3">⚠</div>
      <div className="text-[14px] font-semibold text-rose-300">Intelligence Feed Unavailable</div>
      <div className="mt-1.5 max-w-sm text-[12px] text-[#70809A]">
        {message ?? "Unable to load signal intelligence. The feed may be temporarily unavailable."}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-[#A7B4C8] hover:bg-white/10 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
