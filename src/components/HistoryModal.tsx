import React, { useState, useMemo } from 'react';
import {
  History,
  X,
  Search,
  Star,
  Trash2,
  Package,
  Globe,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { HistoryScanItem } from '../types';
import { formatRelativeTime } from '../utils/historyStorage';

interface HistoryModalProps {
  isOpen: boolean;
  history: HistoryScanItem[];
  onClose: () => void;
  onSelectScan: (item: HistoryScanItem) => void;
  onToggleFavorite: (barcode: string) => void;
  onDeleteEntry: (barcode: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  history,
  onClose,
  onSelectScan,
  onToggleFavorite,
  onDeleteEntry,
  onClearAll,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Filtered entries based on tab & search query
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

  if (!isOpen) return null;

  return (
    <div
      id="history-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="history-modal-container"
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Scan History
                <span className="text-[11px] font-mono font-normal text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded-full">
                  {history.length}/200
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">Persisted across browser sessions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close history modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Search + Tabs */}
        <div className="p-4 border-b border-zinc-800/80 space-y-3 bg-zinc-900/90">
          {/* Search box filtering by product name */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, brand, or barcode..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Tabs: All Scans / Favorites */}
          <div className="flex items-center justify-between gap-2">
            <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs font-medium w-full">
              <button
                id="tab-history-all"
                onClick={() => setActiveTab('all')}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>All Scans</span>
                <span className="text-[10px] bg-zinc-900 px-1.5 py-0.2 rounded-full text-zinc-400">
                  {history.length}
                </span>
              </button>

              <button
                id="tab-history-favorites"
                onClick={() => setActiveTab('favorites')}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'favorites'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Favorites</span>
                {favoritesCount > 0 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full">
                    {favoritesCount}
                  </span>
                )}
              </button>
            </div>

            {history.length > 0 && (
              <button
                id="btn-clear-all-history"
                onClick={() => setConfirmClearOpen(true)}
                className="px-2.5 py-2 rounded-xl bg-zinc-950 hover:bg-red-950/50 border border-zinc-800 hover:border-red-500/40 text-[11px] text-zinc-400 hover:text-red-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                title="Clear all scans"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Scans List: Reverse-chronological */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredHistory.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
                {activeTab === 'favorites' ? (
                  <Star className="w-6 h-6 text-zinc-600" />
                ) : (
                  <Package className="w-6 h-6 text-zinc-600" />
                )}
              </div>
              <p className="text-xs font-semibold text-zinc-300">
                {searchQuery
                  ? 'No matching scans found'
                  : activeTab === 'favorites'
                  ? 'No favorite products saved yet'
                  : 'No scan history yet'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                {searchQuery
                  ? 'Try searching with a different product name, brand, or barcode.'
                  : activeTab === 'favorites'
                  ? 'Tap the star icon on any product view or history entry to bookmark it.'
                  : 'Scan or manually enter any barcode to record it here automatically.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                id={`history-entry-${item.barcode}`}
                onClick={() => onSelectScan(item)}
                className="group relative flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/70 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer shadow-sm"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : item.source === 'gemini_fallback' ? (
                    <Globe className="w-5 h-5 text-sky-400" />
                  ) : item.source === 'not_found' ? (
                    <HelpCircle className="w-5 h-5 text-zinc-500" />
                  ) : (
                    <Package className="w-5 h-5 text-emerald-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {/* Source Pill */}
                    {item.source === 'openfoodfacts' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Open Food Facts
                      </span>
                    )}
                    {item.source === 'gemini_fallback' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        Web Search
                      </span>
                    )}
                    {item.source === 'not_found' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        Not Found
                      </span>
                    )}

                    {/* Relative Time ("2 hours ago", "yesterday") */}
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-zinc-100 truncate leading-tight">
                    {item.productName}
                  </h3>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                    {item.brand && <span className="truncate">{item.brand}</span>}
                    <span className="font-mono text-zinc-400 text-[10px]">{item.barcode}</span>
                  </div>
                </div>

                {/* Actions: Star toggle + Delete */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleFavorite(item.barcode)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      item.isFavorite
                        ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                        : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                    title={item.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                    aria-label="Toggle favorite"
                  >
                    <Star
                      className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
                    />
                  </button>

                  <button
                    onClick={() => onDeleteEntry(item.barcode)}
                    className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Delete from history"
                    aria-label="Delete history entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/70 text-center">
          <p className="text-[11px] text-zinc-400">
            Tapping any item reopens full details immediately without network re-fetching.
          </p>
        </div>

        {/* Clear All Confirmation Modal Step */}
        {confirmClearOpen && (
          <div
            className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setConfirmClearOpen(false)}
          >
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Clear All History?</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    This will delete all {history.length} saved scans and favorites permanently.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmClearOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearAll();
                    setConfirmClearOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
