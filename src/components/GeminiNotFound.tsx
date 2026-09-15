import React from 'react';
import { SearchX, RefreshCw, Keyboard, HelpCircle } from 'lucide-react';

interface GeminiNotFoundProps {
  barcode: string;
  onScanAnother: () => void;
  onManualEntry: () => void;
}

export const GeminiNotFound: React.FC<GeminiNotFoundProps> = ({
  barcode,
  onScanAnother,
  onManualEntry,
}) => {
  return (
    <div
      id="gemini-not-found-view"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />

      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto mb-4 text-amber-400">
        <SearchX className="w-7 h-7" />
      </div>

      <h2 className="text-lg font-bold text-zinc-100 mb-1">
        No information found for this barcode
      </h2>

      <p className="text-xs text-zinc-400 mb-4 max-w-xs mx-auto">
        Barcode <span className="font-mono text-amber-300 font-semibold">{barcode}</span> was not found in Open Food Facts or through web search.
      </p>

      {/* Required note by user instructions */}
      <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80 mb-5 text-left flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-zinc-400 leading-relaxed">
          <p className="font-medium text-zinc-300 mb-0.5">Regional or Private Barcode</p>
          <p>
            Some store-specific or regional barcodes aren't in any public database. In-store inventory codes and private retailer labels often lack public indexing.
          </p>
        </div>
      </div>

      {/* Actions with manual entry remaining available */}
      <div className="space-y-2.5">
        <button
          id="btn-scan-another-gemini-not-found"
          onClick={onScanAnother}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Scan Another Barcode</span>
        </button>

        <button
          id="btn-manual-entry-gemini-not-found"
          onClick={onManualEntry}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Enter Barcode Manually</span>
        </button>
      </div>
    </div>
  );
};
