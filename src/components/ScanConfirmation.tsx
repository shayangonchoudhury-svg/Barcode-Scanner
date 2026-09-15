import React from 'react';
import { Check } from 'lucide-react';

interface ScanConfirmationProps {
  barcode: string;
}

export const ScanConfirmation: React.FC<ScanConfirmationProps> = ({ barcode }) => {
  return (
    <div
      id="scan-confirmation-overlay"
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-fade-in" />
      <div
        id="scan-confirmation-box"
        className="relative z-10 flex flex-col items-center gap-3 bg-zinc-900/95 border border-emerald-500/40 px-6 py-5 rounded-3xl shadow-2xl shadow-emerald-500/20 animate-scale-bounce text-center"
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/30">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Barcode Detected
          </span>
          <p className="text-base font-mono font-bold text-white tracking-wide">
            {barcode}
          </p>
        </div>
      </div>
    </div>
  );
};
