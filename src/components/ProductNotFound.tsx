import React from 'react';
import { SearchX, RefreshCw, ExternalLink, Keyboard } from 'lucide-react';

interface ProductNotFoundProps {
  barcode: string;
  onScanAnother: () => void;
  onManualEntry?: () => void;
}

export const ProductNotFound: React.FC<ProductNotFoundProps> = ({
  barcode,
  onScanAnother,
  onManualEntry,
}) => {
  return (
    <div
      id="product-not-found-view"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden"
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />

      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto mb-4 text-amber-400">
        <SearchX className="w-7 h-7" />
      </div>

      <h2 className="text-lg font-bold text-zinc-100 mb-1">
        Not Found in Food Database
      </h2>

      <p className="text-xs text-zinc-400 mb-4 max-w-xs mx-auto">
        Barcode <span className="font-mono text-amber-300 font-semibold">{barcode}</span> was not found in the Open Food Facts global database.
      </p>

      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80 mb-5 text-left">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <span>Decoded barcode</span>
          <span className="font-mono text-zinc-200 font-bold">{barcode}</span>
        </div>
        <p className="text-[11px] text-zinc-500">
          This product might be a non-food item, local store brand, or not yet indexed in Open Food Facts.
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          id="btn-scan-another-not-found"
          onClick={onScanAnother}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Scan Another Barcode</span>
        </button>

        <div className="flex gap-2">
          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Enter Code</span>
            </button>
          )}

          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(barcode + ' product')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-zinc-700"
          >
            <span>Google Search</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
