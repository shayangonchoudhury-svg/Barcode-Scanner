import React from 'react';
import { WifiOff, History } from 'lucide-react';

interface OfflineBannerProps {
  onOpenHistory: () => void;
  cachedItemsCount: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  onOpenHistory,
  cachedItemsCount,
}) => {
  return (
    <div
      id="offline-status-banner"
      className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-200 text-xs animate-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
          <WifiOff className="w-3.5 h-3.5" />
        </div>
        <div className="truncate">
          <span className="font-semibold text-amber-300">You're offline</span>
          <span className="text-amber-200/80 hidden sm:inline"> — new lookups require network, but saved scans are ready.</span>
        </div>
      </div>

      <button
        onClick={onOpenHistory}
        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        <span>View History ({cachedItemsCount})</span>
      </button>
    </div>
  );
};
