import { HistoryScanItem, ProductData, GeminiProductResult } from '../types';

export const HISTORY_STORAGE_KEY = 'barcode_scanner_history_v1';
export const MAX_HISTORY_ITEMS = 200;

/**
 * Retrieves persisted scan history from localStorage
 */
export function getStoredHistory(): HistoryScanItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HISTORY_ITEMS);
  } catch (err) {
    console.warn('Failed to parse scan history from localStorage:', err);
    return [];
  }
}

/**
 * Saves scan history array to localStorage (capped at 200 items)
 */
export function saveHistoryToStorage(history: HistoryScanItem[]): void {
  try {
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Failed to persist scan history:', err);
  }
}

/**
 * Formats a Unix timestamp into human-readable relative time:
 * "just now", "5 mins ago", "2 hours ago", "yesterday", "4 days ago"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSeconds < 45) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'min' : 'mins'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Adds or updates a scan in history:
 * - Preserves existing favorite status if item was already favorited
 * - Puts newest scan at the very top (reverse-chronological)
 * - Drops oldest when exceeding MAX_HISTORY_ITEMS (200)
 */
export function recordScanInHistory(params: {
  barcode: string;
  source: 'openfoodfacts' | 'gemini_fallback' | 'not_found';
  productName?: string;
  brand?: string;
  imageUrl?: string;
  product?: ProductData | null;
  geminiResult?: GeminiProductResult | null;
}): HistoryScanItem[] {
  const current = getStoredHistory();
  const existingIndex = current.findIndex((item) => item.barcode === params.barcode);
  const wasFavorite = existingIndex >= 0 ? current[existingIndex].isFavorite : false;

  const newItem: HistoryScanItem = {
    id: `${params.barcode}-${Date.now()}`,
    barcode: params.barcode,
    timestamp: Date.now(),
    productName: params.productName || (params.source === 'not_found' ? 'Product Not Found' : 'Unknown Product'),
    brand: params.brand,
    imageUrl: params.imageUrl,
    source: params.source,
    isFavorite: wasFavorite,
    cachedProduct: params.product || null,
    cachedGeminiResult: params.geminiResult || null,
  };

  // Remove previous entry with this barcode (if any) and place new item at head
  const filtered = current.filter((item) => item.barcode !== params.barcode);
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

  saveHistoryToStorage(updated);
  return updated;
}

/**
 * Toggles the favorite status for a barcode in history
 */
export function toggleHistoryFavorite(barcode: string): HistoryScanItem[] {
  const current = getStoredHistory();
  const updated = current.map((item) => {
    if (item.barcode === barcode) {
      return { ...item, isFavorite: !item.isFavorite };
    }
    return item;
  });

  saveHistoryToStorage(updated);
  return updated;
}

/**
 * Deletes a single entry from history
 */
export function removeHistoryEntry(barcode: string): HistoryScanItem[] {
  const current = getStoredHistory();
  const updated = current.filter((item) => item.barcode !== barcode);
  saveHistoryToStorage(updated);
  return updated;
}

/**
 * Clears all history entries
 */
export function clearAllStoredHistory(): HistoryScanItem[] {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear history:', err);
  }
  return [];
}
