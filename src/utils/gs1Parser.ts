/**
 * GS1 Application Identifier (AI) Parser and Date Validator
 * 
 * Standard GS1 AIs supported:
 * - AI 11 = Production / Manufacture Date (YYMMDD)
 * - AI 17 = Expiry Date (YYMMDD)
 * - AI 10 = Batch / Lot Number (alphanumeric, variable length up to 20 chars)
 * - AI 15 = Best Before Date (YYMMDD, fallback for expiry if 17 is missing)
 */

export interface ParsedGS1Result {
  raw: string;
  hasMatches: boolean;
  manufactureDate?: string; // YYYY-MM-DD
  manufactureDateDisplay?: string; // Readable formatted string, e.g. "15 Sep 2026"
  expiryDate?: string; // YYYY-MM-DD
  expiryDateDisplay?: string; // Readable formatted string, e.g. "30 Dec 2026"
  batchNumber?: string;
  expiryCountdown?: {
    days: number;
    text: string;
    isExpired: boolean;
    isExpiringSoon: boolean; // e.g. within 7 days
    status: 'expired' | 'warning' | 'valid';
  };
}

/**
 * Validate and convert GS1 YYMMDD string to a real date.
 * GS1 standard:
 * - YY: 51-99 indicates 1951-1999, 00-50 indicates 2000-2050 (or current century window)
 * - MM: 01-12
 * - DD: 01-31. Note: In GS1, DD = 00 designates the last day of the given month.
 */
export function parseGS1Date(yymmdd: string): { isoDate: string; displayDate: string; dateObj: Date } | null {
  if (!/^\d{6}$/.test(yymmdd)) {
    return null;
  }

  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  let dd = parseInt(yymmdd.substring(4, 6), 10);

  if (mm < 1 || mm > 12) {
    return null;
  }

  // Century determination
  const year = yy >= 50 ? 1900 + yy : 2000 + yy;

  // Plausibility check: Food and pharma dates must be within a realistic timeframe (not decades in the past/future)
  // Reasonable envelope: 2000 to 2045
  if (year < 2000 || year > 2045) {
    return null;
  }

  // If day is 00, GS1 specification specifies it means the last day of that month
  if (dd === 0) {
    dd = new Date(year, mm, 0).getDate();
  }

  const daysInMonth = new Date(year, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) {
    return null;
  }

  const dateObj = new Date(year, mm - 1, dd);
  const mmStr = String(mm).padStart(2, '0');
  const ddStr = String(dd).padStart(2, '0');
  const isoDate = `${year}-${mmStr}-${ddStr}`;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const displayDate = `${dd} ${monthNames[mm - 1]} ${year}`;

  return { isoDate, displayDate, dateObj };
}

/**
 * Calculate countdown and expiration status relative to current day
 */
export function calculateExpiryCountdown(expiryIsoDate: string): {
  days: number;
  text: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  status: 'expired' | 'warning' | 'valid';
} {
  const [y, m, d] = expiryIsoDate.split('-').map(Number);
  const expiryMidnight = new Date(y, m - 1, d).getTime();

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffMs = expiryMidnight - todayMidnight;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      days: diffDays,
      text: `Expired ${absDays} ${absDays === 1 ? 'day' : 'days'} ago`,
      isExpired: true,
      isExpiringSoon: false,
      status: 'expired',
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      text: 'Expires today',
      isExpired: false,
      isExpiringSoon: true,
      status: 'warning',
    };
  } else if (diffDays <= 7) {
    return {
      days: diffDays,
      text: `Expires in ${diffDays} ${diffDays === 1 ? 'day' : 'days'} (soon)`,
      isExpired: false,
      isExpiringSoon: true,
      status: 'warning',
    };
  } else {
    return {
      days: diffDays,
      text: `Expires in ${diffDays} days`,
      isExpired: false,
      isExpiringSoon: false,
      status: 'valid',
    };
  }
}

/**
 * Parse any GS1 string (parenthesized like (17)260930(10)LOT123, bracketed [17]260930,
 * ASCII 29 / <GS> delimited, or standard unparenthesized GS1-128/DataMatrix).
 */
export function parseGS1Code(input: string): ParsedGS1Result {
  const cleanInput = (input || '').trim();
  const result: ParsedGS1Result = {
    raw: cleanInput,
    hasMatches: false,
  };

  if (!cleanInput) return result;

  let rawManufactureDate: string | undefined;
  let rawExpiryDate: string | undefined;
  let rawBatchNumber: string | undefined;

  // 1. Try Parenthesized / Bracketed format first: e.g. (17)261231(10)B123 or [17]261231[10]B123
  const parenthesizedRegex = /(?:\((\d{2,4})\)|\[(\d{2,4})\])([^\(\[]+)/g;
  let match: RegExpExecArray | null;
  let parenthesizedFound = false;

  while ((match = parenthesizedRegex.exec(cleanInput)) !== null) {
    parenthesizedFound = true;
    const ai = match[1] || match[2];
    const val = match[3].trim();

    if (ai === '11') {
      rawManufactureDate = val.slice(0, 6);
    } else if (ai === '17') {
      rawExpiryDate = val.slice(0, 6);
    } else if (ai === '15' && !rawExpiryDate) {
      // AI 15 is Best Before Date
      rawExpiryDate = val.slice(0, 6);
    } else if (ai === '10') {
      rawBatchNumber = val.slice(0, 20);
    }
  }

  // 2. If not parenthesized, try FNC1 / ASCII 29 (\x1d) delimited stream or raw linear scan
  if (!parenthesizedFound) {
    // Strip symbology identifier prefix like ]C1, ]e0, ]d2 if present
    const stream = cleanInput.replace(/^\][A-Za-z0-9]{2}/, '');
    const segments = stream.split(/[\x1d\x1e\x1f]/);

    for (const seg of segments) {
      let cursor = 0;
      while (cursor < seg.length) {
        const next2 = seg.slice(cursor, cursor + 2);

        // AI 11: Production date (fixed 6 digits)
        if (next2 === '11' && /^\d{6}/.test(seg.slice(cursor + 2, cursor + 8))) {
          rawManufactureDate = seg.slice(cursor + 2, cursor + 8);
          cursor += 8;
          continue;
        }

        // AI 17: Expiry date (fixed 6 digits)
        if (next2 === '17' && /^\d{6}/.test(seg.slice(cursor + 2, cursor + 8))) {
          rawExpiryDate = seg.slice(cursor + 2, cursor + 8);
          cursor += 8;
          continue;
        }

        // AI 15: Best Before (fixed 6 digits)
        if (next2 === '15' && /^\d{6}/.test(seg.slice(cursor + 2, cursor + 8))) {
          if (!rawExpiryDate) rawExpiryDate = seg.slice(cursor + 2, cursor + 8);
          cursor += 8;
          continue;
        }

        // AI 01: GTIN (fixed 14 digits)
        if (next2 === '01' && /^\d{14}/.test(seg.slice(cursor + 2, cursor + 16))) {
          cursor += 16;
          continue;
        }

        // AI 10: Batch/Lot number (variable length, takes rest of segment)
        if (next2 === '10') {
          const rest = seg.slice(cursor + 2);
          // If rest contains another known AI prefix, stop there, else take up to 20 chars
          const subMatch = rest.match(/^([A-Za-z0-9_-]{1,20})(?:17\d{6}|11\d{6}|01\d{14})?/);
          rawBatchNumber = subMatch ? subMatch[1] : rest.slice(0, 20);
          break;
        }

        cursor++;
      }
    }
  }

  // Validate parsed dates
  if (rawManufactureDate) {
    const parsedM = parseGS1Date(rawManufactureDate);
    if (parsedM) {
      result.manufactureDate = parsedM.isoDate;
      result.manufactureDateDisplay = parsedM.displayDate;
      result.hasMatches = true;
    }
  }

  if (rawExpiryDate) {
    const parsedE = parseGS1Date(rawExpiryDate);
    if (parsedE) {
      result.expiryDate = parsedE.isoDate;
      result.expiryDateDisplay = parsedE.displayDate;
      result.expiryCountdown = calculateExpiryCountdown(parsedE.isoDate);
      result.hasMatches = true;
    }
  }

  if (rawBatchNumber && rawBatchNumber.trim()) {
    result.batchNumber = rawBatchNumber.trim();
    result.hasMatches = true;
  }

  return result;
}
