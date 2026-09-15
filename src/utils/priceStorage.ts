/**
 * Personal Price Tracking Storage
 * 
 * Strict Requirement:
 * - Purely user-entered data. Never fetch, scrape, or estimate a price from any external source.
 * - Stored per barcode with timestamp, store name, and price value.
 * - Computes price differences ("+₹3 since last time", "-$0.50 since last time").
 */

import { PriceRecord } from '../types';

const STORAGE_KEY = 'barcode_scanner_user_prices_v1';

export interface PriceDiffResult {
  currentRecord: PriceRecord;
  previousRecord?: PriceRecord;
  diffAmount?: number;
  diffFormatted?: string;
  diffPercent?: number;
  trend: 'up' | 'down' | 'same' | 'first_entry';
}

export function getAllPriceRecords(): Record<string, PriceRecord[]> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse price records from storage:', e);
    return {};
  }
}

export function getPricesForBarcode(barcode: string): PriceRecord[] {
  if (!barcode) return [];
  const all = getAllPriceRecords();
  const list = all[barcode.trim()] || [];
  // Sort descending by timestamp (newest first)
  return [...list].sort((a, b) => b.timestamp - a.timestamp);
}

export function addPriceRecord(
  barcode: string,
  price: number,
  storeName: string,
  currencySymbol: string = '₹'
): PriceRecord {
  const cleanCode = barcode.trim();
  const cleanStore = (storeName || '').trim() || 'Unspecified Store';
  const cleanCurrency = (currencySymbol || '').trim() || '₹';
  
  // Format nicely (e.g. ₹250 or $4.99)
  const formattedPrice = `${cleanCurrency}${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;

  const newRecord: PriceRecord = {
    id: `price_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    barcode: cleanCode,
    price,
    currencySymbol: cleanCurrency,
    formattedPrice,
    storeName: cleanStore,
    timestamp: Date.now(),
  };

  const all = getAllPriceRecords();
  const existing = all[cleanCode] || [];
  all[cleanCode] = [newRecord, ...existing];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save price record:', e);
  }

  return newRecord;
}

export function removePriceRecord(barcode: string, recordId: string): void {
  const cleanCode = barcode.trim();
  const all = getAllPriceRecords();
  const existing = all[cleanCode] || [];
  all[cleanCode] = existing.filter((item) => item.id !== recordId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to delete price record:', e);
  }
}

/**
 * Calculate price difference between the most recent entry and the one immediately before it
 */
export function getLatestPriceDifference(records: PriceRecord[]): PriceDiffResult | null {
  if (!records || records.length === 0) return null;

  const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
  const current = sorted[0];

  if (sorted.length === 1) {
    return {
      currentRecord: current,
      trend: 'first_entry',
    };
  }

  const previous = sorted[1];
  const diff = current.price - previous.price;
  const currSym = current.currencySymbol || previous.currencySymbol || '';

  if (diff === 0) {
    return {
      currentRecord: current,
      previousRecord: previous,
      diffAmount: 0,
      diffFormatted: `±${currSym}0 (no change)`,
      diffPercent: 0,
      trend: 'same',
    };
  }

  const diffAbs = Math.abs(diff);
  const formattedAbs = diffAbs % 1 === 0 ? diffAbs.toFixed(0) : diffAbs.toFixed(2);
  const percent = previous.price > 0 ? (diff / previous.price) * 100 : 0;

  if (diff > 0) {
    return {
      currentRecord: current,
      previousRecord: previous,
      diffAmount: diff,
      diffFormatted: `+${currSym}${formattedAbs} since last time`,
      diffPercent: Math.round(percent),
      trend: 'up',
    };
  } else {
    return {
      currentRecord: current,
      previousRecord: previous,
      diffAmount: diff,
      diffFormatted: `-${currSym}${formattedAbs} since last time`,
      diffPercent: Math.round(percent),
      trend: 'down',
    };
  }
}
