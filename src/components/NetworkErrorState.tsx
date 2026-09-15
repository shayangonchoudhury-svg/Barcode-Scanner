import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface NetworkErrorStateProps {
  barcode: string;
  errorMessage?: string;
  onRetry: () => void;
  onScanAnother: () => void;
}

export const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({
  barcode,
  errorMessage,
  onRetry,
  onScanAnother,
}) => {
  return (
    <div
      id="product-network-error-view"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden"
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-rose-500" />

      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto mb-4 text-rose-400">
        <WifiOff className="w-7 h-7" />
      </div>

      <h2 className="text-lg font-bold text-zinc-100 mb-1">
        Couldn't reach the lookup service
      </h2>

      <p className="text-xs text-zinc-400 mb-4 max-w-xs mx-auto">
        Unable to complete lookup for barcode{' '}
        <span className="font-mono text-zinc-300 font-semibold">{barcode}</span>. Check your connection and retry.
      </p>

      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80 mb-5 text-left flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400">
          {errorMessage || "Couldn't reach the lookup service, check your connection and retry."}
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          id="btn-retry-network-fetch"
          onClick={onRetry}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Lookup</span>
        </button>

        <button
          onClick={onScanAnother}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
        >
          <span>Scan Another Barcode</span>
        </button>
      </div>
    </div>
  );
};
