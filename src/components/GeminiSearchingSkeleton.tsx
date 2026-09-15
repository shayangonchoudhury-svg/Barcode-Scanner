import React from 'react';
import { Globe, Loader2 } from 'lucide-react';

interface GeminiSearchingSkeletonProps {
  barcode: string;
  step?: 'off' | 'upcitemdb' | 'gemini';
}

export const GeminiSearchingSkeleton: React.FC<GeminiSearchingSkeletonProps> = ({
  barcode,
  step = 'gemini',
}) => {
  const stepLabel =
    step === 'off'
      ? 'Checking Open Food Facts database...'
      : step === 'upcitemdb'
      ? 'Checking UPCItemDB retail catalog...'
      : 'Searching live web indices with Gemini AI...';

  return (
    <div
      id="gemini-searching-skeleton"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-3 p-3 bg-sky-500/10 border border-sky-500/25 rounded-2xl">
        <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-300">
            {stepLabel}
          </p>
          <p className="text-[11px] text-zinc-400 font-mono truncate">
            Barcode {barcode} · Sequential Lookup Chain
          </p>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center animate-pulse">
          <Globe className="w-8 h-8 text-zinc-700" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-1/3 animate-pulse" />
          <div className="h-5 bg-zinc-800 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-zinc-800 rounded w-1/2 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-14 bg-zinc-950/80 border border-zinc-800 rounded-2xl animate-pulse" />
        <div className="h-14 bg-zinc-950/80 border border-zinc-800 rounded-2xl animate-pulse" />
      </div>

      <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2">
        <div className="h-3 bg-zinc-800 rounded w-1/4 animate-pulse" />
        <div className="h-3 bg-zinc-800 rounded w-full animate-pulse" />
        <div className="h-3 bg-zinc-800 rounded w-4/5 animate-pulse" />
      </div>
    </div>
  );
};
