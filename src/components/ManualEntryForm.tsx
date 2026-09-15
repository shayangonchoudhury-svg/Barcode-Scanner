import React, { useState } from 'react';
import { Keyboard, ArrowRight, Sparkles } from 'lucide-react';

interface ManualEntryFormProps {
  onSubmit: (code: string, format: string) => void;
  onCancelScan?: () => void;
}

const SAMPLE_CODES = [
  { label: 'Nutella (Ferrero)', code: '3017620422003', format: 'ean_13' },
  { label: 'Oreo Biscuits', code: '7622210449283', format: 'ean_13' },
  { label: 'Coca-Cola 330ml', code: '5449000000996', format: 'ean_13' },
  { label: 'Test Unindexed Code', code: '0000000000000', format: 'ean_13' },
];

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({
  onSubmit,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('manual');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = barcodeInput.trim();
    if (!cleanCode) {
      setValidationError('Please enter a barcode or product code number.');
      return;
    }

    setValidationError(null);
    onSubmit(cleanCode, selectedFormat);
  };

  const handleApplySample = (sampleCode: string, format: string) => {
    setBarcodeInput(sampleCode);
    setSelectedFormat(format);
    setValidationError(null);
  };

  return (
    <div
      id="manual-entry-section"
      className="w-full max-w-md bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Keyboard className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Manual Barcode Entry</h3>
          <p className="text-xs text-zinc-400">Use when camera lighting is poor or code is damaged</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="manual-barcode-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
            Barcode Value or Number
          </label>
          <div className="relative">
            <input
              id="manual-barcode-input"
              type="text"
              autoComplete="off"
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. 012345678905 or SKU-99"
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          {validationError && (
            <p className="text-xs text-rose-400 mt-1.5">{validationError}</p>
          )}
        </div>

        <button
          type="submit"
          id="btn-submit-manual-barcode"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
        >
          <span>Submit Barcode</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Quick sample chips to help test in emulators or camera-less devices */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80">
        <p className="text-[11px] font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Test with standard demo codes:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_CODES.map((sample) => (
            <button
              key={sample.code}
              type="button"
              onClick={() => handleApplySample(sample.code, sample.format)}
              className="text-[11px] font-mono bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
              title={`Click to fill ${sample.label}`}
            >
              {sample.code} <span className="text-[10px] text-zinc-500">({sample.format})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
