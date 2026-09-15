import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  QrCode,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Save,
  X,
  Info,
} from 'lucide-react';
import { BatchExpiryRecord } from '../types';
import {
  getBatchExpiryRecord,
  saveBatchExpiryRecord,
  deleteBatchExpiryRecord,
} from '../utils/batchExpiryStorage';
import { calculateExpiryCountdown } from '../utils/gs1Parser';

interface BatchExpirySectionProps {
  barcode: string;
  onScanSecondaryCode: () => void;
}

export const BatchExpirySection: React.FC<BatchExpirySectionProps> = ({
  barcode,
  onScanSecondaryCode,
}) => {
  const [record, setRecord] = useState<BatchExpiryRecord | null>(null);
  const [isEditingManual, setIsEditingManual] = useState(false);

  // Manual entry form fields
  const [batchInput, setBatchInput] = useState('');
  const [mfgDateInput, setMfgDateInput] = useState('');
  const [expDateInput, setExpDateInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load record on mount or barcode change
  useEffect(() => {
    const existing = getBatchExpiryRecord(barcode);
    setRecord(existing);
    if (existing) {
      setBatchInput(existing.batchNumber || '');
      setMfgDateInput(existing.manufactureDate || '');
      setExpDateInput(existing.expiryDate || '');
    } else {
      setBatchInput('');
      setMfgDateInput('');
      setExpDateInput('');
    }
  }, [barcode]);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!batchInput.trim() && !mfgDateInput && !expDateInput) {
      setFormError('Please enter at least a batch number, manufacture date, or expiry date.');
      return;
    }

    // Validate date plausibility if entered
    if (expDateInput && mfgDateInput && expDateInput < mfgDateInput) {
      setFormError('Expiry date cannot be earlier than manufacture date.');
      return;
    }

    const newRecord: BatchExpiryRecord = {
      barcode: barcode.trim(),
      batchNumber: batchInput.trim() || undefined,
      manufactureDate: mfgDateInput || undefined,
      expiryDate: expDateInput || undefined,
      source: 'manual_entry',
      updatedAt: Date.now(),
    };

    saveBatchExpiryRecord(newRecord);
    setRecord(newRecord);
    setIsEditingManual(false);
  };

  const handleDelete = () => {
    deleteBatchExpiryRecord(barcode);
    setRecord(null);
    setBatchInput('');
    setMfgDateInput('');
    setExpDateInput('');
    setIsEditingManual(false);
  };

  const countdown = record?.expiryDate
    ? calculateExpiryCountdown(record.expiryDate)
    : null;

  const hasData = Boolean(
    record && (record.batchNumber || record.manufactureDate || record.expiryDate)
  );

  return (
    <div
      id="section-batch-expiry"
      className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Batch & Expiry
          </h4>
        </div>

        {hasData && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              record?.source === 'gs1_barcode'
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {record?.source === 'gs1_barcode'
              ? 'GS1 Barcode (AI 10/11/17)'
              : 'Entered manually from packaging'}
          </span>
        )}
      </div>

      {/* Strict disclaimer: primary barcode does not encode date or price */}
      <p className="text-[11px] text-zinc-500 leading-snug">
        Standard EAN/UPC barcodes do not encode batch or expiry dates. Those require a secondary GS1-128 / Data Matrix code or manual verification.
      </p>

      {/* When data is present */}
      {hasData && record && !isEditingManual && (
        <div className="space-y-3 pt-1">
          {/* Expiry Countdown Banner if expiry date present */}
          {countdown && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-3 ${
                countdown.status === 'expired'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : countdown.status === 'warning'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              }`}
            >
              {countdown.status === 'expired' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : countdown.status === 'warning' ? (
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold block">{countdown.text}</span>
                <span className="text-[10px] opacity-80 block">
                  Official expiry date: {record.expiryDate}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Batch / Lot */}
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 col-span-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Batch / Lot Number (AI 10)
              </span>
              <p className="font-mono text-zinc-200 text-sm font-semibold mt-0.5">
                {record.batchNumber || 'Not specified'}
              </p>
            </div>

            {/* Manufacture Date */}
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Manufacture Date (AI 11)
              </span>
              <p className="font-mono text-zinc-300 text-xs font-medium mt-0.5">
                {record.manufactureDate || 'Not recorded'}
              </p>
            </div>

            {/* Expiry Date */}
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Expiry Date (AI 17)
              </span>
              <p className="font-mono text-zinc-300 text-xs font-medium mt-0.5">
                {record.expiryDate || 'Not recorded'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setIsEditingManual(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Delete batch record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* When no data is present and not currently editing */}
      {!hasData && !isEditingManual && (
        <div className="space-y-3 pt-1">
          <div className="py-2 text-xs text-zinc-400 bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80">
            <p className="font-medium text-zinc-300">
              No batch or expiry date recorded yet
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Scan a secondary GS1 code on the box/carton, or enter the dates stamped on packaging.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              id="btn-scan-batch-code"
              onClick={onScanSecondaryCode}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-semibold transition-all shadow-md shadow-purple-950/40 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan batch/expiry code</span>
            </button>

            <button
              id="btn-manual-batch-entry"
              onClick={() => setIsEditingManual(true)}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Enter Manually</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {isEditingManual && (
        <form onSubmit={handleSaveManual} className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
            <span className="text-xs font-bold text-zinc-200">
              Enter Dates & Batch from Packaging
            </span>
            <button
              type="button"
              onClick={() => setIsEditingManual(false)}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              {formError}
            </p>
          )}

          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Batch / Lot Number
            </label>
            <input
              type="text"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="e.g. LOT-2026-A12"
              className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Manufacture Date
              </label>
              <input
                type="date"
                value={mfgDateInput}
                onChange={(e) => setMfgDateInput(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expDateInput}
                onChange={(e) => setExpDateInput(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Clearly labeled as &quot;entered manually from packaging&quot; — never estimated.</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingManual(false)}
              className="flex-1 py-2 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-emerald-950/40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Record</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
