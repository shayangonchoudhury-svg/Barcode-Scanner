import React, { useState } from 'react';
import { Check, Copy, RefreshCw, Barcode, ExternalLink, Clock } from 'lucide-react';
import { BarcodeResult } from '../types';

interface ScanResultCardProps {
  result: BarcodeResult;
  onScanAnother: () => void;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
  result,
  onScanAnother,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getEngineBadge = (source: BarcodeResult['source']) => {
    switch (source) {
      case 'native':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Native BarcodeDetector
          </span>
        );
      case 'html5-qrcode':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            html5-qrcode Fallback
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Manual Entry
          </span>
        );
    }
  };

  return (
    <div
      id="scan-result-card"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Glow header banner */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Barcode Detected
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <Clock className="w-3 h-3" />
              <span>{result.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {getEngineBadge(result.source)}
      </div>

      {/* Primary barcode number box */}
      <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 mb-4 text-center">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
          Decoded Value
        </span>
        <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tracking-wider break-all select-all py-1">
          {result.code}
        </div>
      </div>

      {/* Metadata tags */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Format</span>
          <span className="text-xs font-mono font-semibold text-zinc-200 uppercase">
            {result.format || 'Standard'}
          </span>
        </div>
        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Method</span>
          <span className="text-xs font-medium text-zinc-200 capitalize">
            {result.source.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        <div className="flex gap-2">
          <button
            id="btn-copy-code"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Value</span>
              </>
            )}
          </button>

          <a
            id="btn-lookup-product"
            href={`https://www.google.com/search?q=${encodeURIComponent(result.code)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-zinc-700"
            title="Search Google for this barcode"
          >
            <span>Search</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Scan Another Button */}
        <button
          id="btn-scan-another"
          onClick={onScanAnother}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Scan Another Barcode</span>
        </button>
      </div>
    </div>
  );
};
