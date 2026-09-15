import React from 'react';
import { SearchX, RefreshCw, Keyboard, Camera, Sparkles } from 'lucide-react';

interface GeminiNotFoundProps {
  barcode: string;
  onScanAnother: () => void;
  onManualEntry: () => void;
  onTryPhoto?: () => void;
}

export const GeminiNotFound: React.FC<GeminiNotFoundProps> = ({
  barcode,
  onScanAnother,
  onManualEntry,
  onTryPhoto,
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
        Barcode <span className="font-mono text-amber-300 font-semibold">{barcode}</span> was not found across Open Food Facts, UPCItemDB, or web search.
      </p>

      {/* Visual Photo Identification Fallback Callout */}
      <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/25 mb-5 text-left">
        <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1.5">
          <Camera className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Couldn't identify by barcode — try a photo instead</span>
        </div>
        <p className="text-[11px] text-zinc-300 leading-relaxed mb-3">
          Take a photo of the product packaging or front logo. Visual AI can recognize the item directly even if the barcode isn't in any database.
        </p>
        {onTryPhoto && (
          <button
            id="btn-try-photo-fallback"
            onClick={onTryPhoto}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Camera in Photo Mode</span>
          </button>
        )}
      </div>

      {/* Actions with scan another and manual entry */}
      <div className="space-y-2.5">
        <button
          id="btn-scan-another-gemini-not-found"
          onClick={onScanAnother}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Scan Another Barcode</span>
        </button>

        <button
          id="btn-manual-entry-gemini-not-found"
          onClick={onManualEntry}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors border border-zinc-800 cursor-pointer"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Enter Product Details Manually</span>
        </button>
      </div>
    </div>
  );
};
