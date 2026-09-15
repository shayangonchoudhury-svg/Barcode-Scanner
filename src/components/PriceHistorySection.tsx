import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Store,
  Calendar,
  Trash2,
  Check,
  Tag,
} from 'lucide-react';
import { PriceRecord } from '../types';
import {
  getPricesForBarcode,
  addPriceRecord,
  removePriceRecord,
  getLatestPriceDifference,
} from '../utils/priceStorage';

interface PriceHistorySectionProps {
  barcode: string;
}

const COMMON_CURRENCIES = ['₹', '$', '€', '£', '¥', 'C$', 'A$'];

export const PriceHistorySection: React.FC<PriceHistorySectionProps> = ({
  barcode,
}) => {
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [priceInput, setPriceInput] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [storeInput, setStoreInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  // Load existing user prices on mount and barcode change
  useEffect(() => {
    const records = getPricesForBarcode(barcode);
    setPrices(records);
    if (records.length > 0 && records[0].currencySymbol) {
      setCurrencySymbol(records[0].currencySymbol);
    }
  }, [barcode]);

  const handleAddPrice = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedPrice = parseFloat(priceInput.replace(/,/g, '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid shelf price amount greater than 0.');
      return;
    }

    const created = addPriceRecord(
      barcode,
      parsedPrice,
      storeInput,
      currencySymbol
    );

    const updated = [created, ...prices];
    setPrices(updated);
    setPriceInput('');
    setStoreInput('');
    setShowAddForm(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

  const handleRemove = (id: string) => {
    removePriceRecord(barcode, id);
    setPrices((prev) => prev.filter((p) => p.id !== id));
  };

  const diffResult = getLatestPriceDifference(prices);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      id="section-price-history"
      className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Your Price History
          </h4>
        </div>

        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Close' : 'Add Price'}</span>
        </button>
      </div>

      <p className="text-[11px] text-zinc-500 leading-snug">
        Personal shelf price tracking. Never fetched or estimated from external sources.
      </p>

      {/* Price Difference Highlight Banner if 2+ entries */}
      {diffResult && diffResult.previousRecord && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            diffResult.trend === 'up'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : diffResult.trend === 'down'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {diffResult.trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-rose-400 shrink-0" />
            ) : diffResult.trend === 'down' ? (
              <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Minus className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span className="font-semibold">{diffResult.diffFormatted}</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Was {diffResult.previousRecord.formattedPrice}
          </span>
        </div>
      )}

      {/* Add Price Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddPrice}
          className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
            <span className="text-xs font-bold text-zinc-200">
              Record Shelf Price
            </span>
          </div>

          {errorMsg && (
            <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              {errorMsg}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Currency
              </label>
              <select
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-2 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Shelf Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="e.g. 24.50"
                autoFocus
                className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Store / Location (Optional)
            </label>
            <input
              type="text"
              value={storeInput}
              onChange={(e) => setStoreInput(e.target.value)}
              placeholder="e.g. Trader Joe's, Tesco, Local Mart"
              className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-emerald-950/40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Price</span>
            </button>
          </div>
        </form>
      )}

      {/* Price History List */}
      {prices.length > 0 ? (
        <div className="space-y-2 pt-1">
          {prices.map((item, idx) => {
            // Compare to next item in array (which is the previous chronologically)
            const prevItem = prices[idx + 1];
            let itemDiffText = '';
            let itemTrend: 'up' | 'down' | 'same' | 'first' = 'first';

            if (prevItem) {
              const diff = item.price - prevItem.price;
              const abs = Math.abs(diff);
              const absFormatted = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2);
              if (diff > 0) {
                itemDiffText = `+${item.currencySymbol}${absFormatted}`;
                itemTrend = 'up';
              } else if (diff < 0) {
                itemDiffText = `-${item.currencySymbol}${absFormatted}`;
                itemTrend = 'down';
              } else {
                itemDiffText = `±0`;
                itemTrend = 'same';
              }
            }

            return (
              <div
                key={item.id}
                className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-100 text-sm">
                      {item.formattedPrice}
                    </span>
                    {itemDiffText && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${
                          itemTrend === 'up'
                            ? 'bg-rose-500/15 text-rose-300'
                            : itemTrend === 'down'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {itemDiffText}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 truncate">
                      <Store className="w-3 h-3 text-zinc-500 shrink-0" />
                      {item.storeName}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-500 shrink-0">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {formatDate(item.timestamp)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-zinc-800"
                  title="Delete this price entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        !showAddForm && (
          <div className="py-2 text-xs text-zinc-400 bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80">
            <p className="font-medium text-zinc-300">
              No personal price recorded yet for this product
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Tap &quot;Add Price&quot; above to log shelf prices and monitor inflation across your local stores.
            </p>
          </div>
        )
      )}
    </div>
  );
};
