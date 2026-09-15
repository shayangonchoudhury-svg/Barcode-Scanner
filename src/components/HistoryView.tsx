import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Star,
  Trash2,
  Package,
  Globe,
  HelpCircle,
  Scan,
  AlertTriangle,
  X,
} from 'lucide-react';
import { HistoryScanItem } from '../types';
import { formatRelativeTime } from '../utils/historyStorage';

interface HistoryViewProps {
  history: HistoryScanItem[];
  onSelectScan: (item: HistoryScanItem) => void;
  onToggleFavorite: (barcode: string) => void;
  onDeleteEntry: (barcode: string) => void;
  onClearAll: () => void;
  onSwitchToScan: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectScan,
  onToggleFavorite,
  onDeleteEntry,
  onClearAll,
  onSwitchToScan,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Filtered list
  const filteredHistory = useMemo(() => {
    let list = history;
    if (activeTab === 'favorites') {
      list = list.filter((item) => item.isFavorite);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.productName.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          item.barcode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [history, activeTab, searchQuery]);

  const favoritesCount = useMemo(
    () => history.filter((i) => i.isFavorite).length,
    [history]
  );

  return (
    <div id="history-view-page" className="w-full max-w-md flex flex-col gap-4 pb-20">
      {/* Top Header Card */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Scan History
              <span className="text-xs font-mono font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                {history.length}/200
              </span>
            </h2>
            <p className="text-xs text-zinc-400">Offline-available product cache</p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="text-xs text-red-400 hover:text-red-300 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Clear all saved history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {confirmClearOpen && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 flex flex-col gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white">Clear All History?</h4>
              <p className="text-xs text-red-200/80 mt-0.5">
                This will delete all {history.length} scans and favorites from local storage.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmClearOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClearAll();
                setConfirmClearOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 cursor-pointer"
            >
              Yes, Clear All
            </button>
          </div>
        </div>
      )}

      {/* Search & Tabs Controls */}
      <div className="flex flex-col gap-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3">
        {/* Search Box */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, brand, or barcode..."
            className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 text-zinc-500 hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabs: All / Favorites */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>All Scans</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'all' ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {history.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${activeTab === 'favorites' ? 'fill-zinc-950' : 'text-amber-400'}`} />
            <span>Favorites</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'favorites'
                  ? 'bg-zinc-950/20 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {favoritesCount}
            </span>
          </button>
        </div>
      </div>

      {/* History List or Empty States */}
      <div className="flex flex-col gap-2.5">
        {filteredHistory.length === 0 ? (
          <div className="py-12 px-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col items-center justify-center text-center gap-3">
            {searchQuery ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">No products found</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    No scans match "<span className="text-zinc-200">{searchQuery}</span>"
                  </p>
                </div>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-1 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Clear Search
                </button>
              </>
            ) : activeTab === 'favorites' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">No favorites saved yet</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Tap the star icon on any scanned product or history card to add it to your favorites list.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('all')}
                  className="mt-1 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  View All Scans
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Scan className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Your scan history is empty</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Scan any food or product barcode with your camera or enter it manually to start building your personal catalog.
                  </p>
                </div>
                <button
                  onClick={onSwitchToScan}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Scan className="w-4 h-4" />
                  <span>Start Scanning</span>
                </button>
              </>
            )}
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isFav = item.isFavorite;
            const sourceBadge =
              item.source === 'openfoodfacts'
                ? { label: 'Open Food Facts', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                : item.source === 'gemini_fallback'
                ? { label: 'Web Search', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' }
                : { label: 'Not Found', bg: 'bg-zinc-800 text-zinc-400 border-zinc-700' };

            return (
              <div
                key={item.id}
                onClick={() => onSelectScan(item)}
                className="group p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-3 cursor-pointer shadow-sm hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : item.source === 'openfoodfacts' ? (
                    <Package className="w-5 h-5 text-emerald-400" />
                  ) : item.source === 'gemini_fallback' ? (
                    <Globe className="w-5 h-5 text-sky-400" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-zinc-500" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${sourceBadge.bg}`}>
                      {sourceBadge.label}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-emerald-300 transition-colors">
                    {item.productName}
                  </h4>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                    <span className="font-mono text-zinc-300">{item.barcode}</span>
                    {item.brand && (
                      <>
                        <span>•</span>
                        <span className="truncate">{item.brand}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleFavorite(item.barcode)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isFav
                        ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                        : 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800'
                    }`}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => onDeleteEntry(item.barcode)}
                    className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
