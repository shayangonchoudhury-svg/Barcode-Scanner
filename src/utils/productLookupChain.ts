import { GeminiProductResult, LookupSource, ProductData } from '../types';
import { fetchOpenFoodFactsProduct } from './openFoodFacts';

export interface ChainLookupResult {
  status: 'found' | 'not_found' | 'network_error';
  source?: LookupSource;
  foundViaLabel?: string;
  product?: ProductData;
  geminiResult?: GeminiProductResult;
  error?: string;
}

/**
 * Executes the full product lookup chain:
 * 1. Open Food Facts (food & grocery database)
 * 2. UPCItemDB (general retail, electronics, household, toys, books)
 * 3. Gemini Search Grounding (live web search with exact & broadened criteria)
 *
 * Separates network/API reachability failure from genuine no-match across all sources.
 */
export async function executeProductLookupChain(
  barcode: string,
  onStepProgress?: (step: 'off' | 'upcitemdb' | 'gemini') => void
): Promise<ChainLookupResult> {
  const cleanCode = String(barcode).trim();
  let anyServiceResponded = false;
  let lastNetworkError: string | undefined;

  // --------------------------------------------------------------------------
  // STEP 1: Open Food Facts
  // --------------------------------------------------------------------------
  try {
    if (onStepProgress) onStepProgress('off');
    const offRes = await fetchOpenFoodFactsProduct(cleanCode);

    if (offRes.status === 'found' && offRes.product) {
      return {
        status: 'found',
        source: 'openfoodfacts',
        foundViaLabel: 'Found via: Open Food Facts',
        product: {
          ...offRes.product,
          lookupSource: 'openfoodfacts',
          foundViaLabel: 'Found via: Open Food Facts',
        },
      };
    }

    if (offRes.status === 'not_found') {
      anyServiceResponded = true;
    } else if (offRes.status === 'network_error') {
      lastNetworkError = offRes.error || 'Open Food Facts service unreachable';
    }
  } catch (err: any) {
    console.warn('Open Food Facts step caught error:', err);
    lastNetworkError = err.message || 'Open Food Facts network failure';
  }

  // --------------------------------------------------------------------------
  // STEP 2: UPCItemDB (Trial tier lookup)
  // --------------------------------------------------------------------------
  try {
    if (onStepProgress) onStepProgress('upcitemdb');
    const upcRes = await fetch('/api/barcode/upcitemdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: cleanCode }),
    });

    if (upcRes.ok) {
      anyServiceResponded = true;
      const upcData = await upcRes.json();

      if (upcData.found && upcData.productName) {
        const generalProduct: GeminiProductResult = {
          barcode: cleanCode,
          found: true,
          rawText: upcData.description || `${upcData.brand || ''} ${upcData.productName}`,
          brand: upcData.brand,
          productName: upcData.productName,
          category: upcData.category,
          priceRange:
            upcData.lowestPrice && upcData.highestPrice
              ? `$${upcData.lowestPrice} – $${upcData.highestPrice}`
              : upcData.lowestPrice
              ? `From $${upcData.lowestPrice}`
              : undefined,
          description: upcData.description,
          imageUrl: upcData.imageUrl,
          images: upcData.images,
          source: 'upcitemdb',
          foundViaLabel: 'Found via: UPCItemDB',
          manufacturer: upcData.manufacturer,
          sources: [
            {
              title: 'UPCItemDB Product Database',
              url: `https://www.upcitemdb.com/upc/${encodeURIComponent(cleanCode)}`,
            },
          ],
        };

        return {
          status: 'found',
          source: 'upcitemdb',
          foundViaLabel: 'Found via: UPCItemDB',
          geminiResult: generalProduct,
        };
      }
    } else {
      const errData = await upcRes.json().catch(() => ({}));
      if (errData.isNetworkError) {
        lastNetworkError = errData.error || 'UPCItemDB service network error';
      } else {
        anyServiceResponded = true;
      }
    }
  } catch (err: any) {
    console.warn('UPCItemDB step caught error:', err);
    lastNetworkError = err.message || 'UPCItemDB network error';
  }

  // --------------------------------------------------------------------------
  // STEP 3: Gemini Search Grounding
  // --------------------------------------------------------------------------
  try {
    if (onStepProgress) onStepProgress('gemini');
    const geminiRes = await fetch('/api/barcode/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: cleanCode }),
    });

    if (geminiRes.ok) {
      anyServiceResponded = true;
      const geminiData = await geminiRes.json();

      if (geminiData.found && (geminiData.productName || geminiData.brand)) {
        const generalProduct: GeminiProductResult = {
          barcode: cleanCode,
          found: true,
          rawText: geminiData.rawText || '',
          brand: geminiData.brand,
          productName: geminiData.productName,
          category: geminiData.category,
          priceRange: geminiData.priceRange,
          description: geminiData.description,
          source: 'web_search',
          foundViaLabel: 'Found via: Web search',
          manufacturer: geminiData.manufacturer,
          sources: geminiData.sources || [],
        };

        return {
          status: 'found',
          source: 'web_search',
          foundViaLabel: 'Found via: Web search',
          geminiResult: generalProduct,
        };
      }
    } else {
      const errData = await geminiRes.json().catch(() => ({}));
      if (errData.isNetworkError) {
        lastNetworkError = errData.error || 'Web search service network error';
      } else {
        anyServiceResponded = true;
      }
    }
  } catch (err: any) {
    console.warn('Gemini search step caught error:', err);
    lastNetworkError = err.message || 'Web search network error';
  }

  // --------------------------------------------------------------------------
  // EVALUATE TERMINAL STATE:
  // If NO service could be reached at all, report true network failure!
  // If services were reached but returned no match, report accurate "not found"!
  // --------------------------------------------------------------------------
  if (!anyServiceResponded && !navigator.onLine) {
    return {
      status: 'network_error',
      error: "Couldn't reach the lookup service, check your connection and retry",
    };
  }

  if (!anyServiceResponded && lastNetworkError) {
    return {
      status: 'network_error',
      error: "Couldn't reach the lookup service, check your connection and retry",
    };
  }

  return {
    status: 'not_found',
    source: 'not_found',
    error: 'No information found for this barcode across Open Food Facts, UPCItemDB, and web search.',
  };
}
