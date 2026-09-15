/**
 * Storage manager for batch numbers, manufacture dates, and expiry dates per barcode.
 * Persists in localStorage alongside scans.
 */

import { BatchExpiryRecord } from '../types';

const STORAGE_KEY = 'barcode_scanner_batch_expiry_v1';

export function getAllBatchExpiryRecords(): Record<string, BatchExpiryRecord> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse batch/expiry records from storage:', e);
    return {};
  }
}

export function getBatchExpiryRecord(barcode: string): BatchExpiryRecord | null {
  if (!barcode) return null;
  const all = getAllBatchExpiryRecords();
  return all[barcode.trim()] || null;
}

export function saveBatchExpiryRecord(record: BatchExpiryRecord): void {
  if (!record || !record.barcode) return;
  const all = getAllBatchExpiryRecords();
  all[record.barcode.trim()] = {
    ...record,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save batch/expiry record:', e);
  }
}

export function deleteBatchExpiryRecord(barcode: string): void {
  if (!barcode) return;
  const all = getAllBatchExpiryRecords();
  delete all[barcode.trim()];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to delete batch/expiry record:', e);
  }
}
