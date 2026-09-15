/**
 * Audio feedback for successful barcode detection using Web Audio API
 */
export function playBeepSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    // Quick unlock if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // High, crisp, pleasant confirmation tone (1200Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);

    // Fast envelope: instant attack, decay over 110ms
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.warn('Web Audio playback failed or blocked by autoplay policy:', err);
  }
}

/**
 * Haptic feedback for supported mobile devices
 */
export function triggerHaptic(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {
    // Vibration disallowed or unsupported
  }
}

/**
 * Target barcode formats specified in requirements
 */
export const TARGET_BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'qr_code',
  'data_matrix',
];

/**
 * Structure of visual photo identification result
 */
export interface VisualIdentificationApiErrorDetails {
  httpStatus?: number;
  endpointUrl: string;
  rawResponseText: string;
  errorMessage: string;
}

export class VisualIdentificationError extends Error {
  httpStatus?: number;
  endpointUrl: string;
  rawResponseText: string;

  constructor(details: VisualIdentificationApiErrorDetails) {
    super(details.errorMessage);
    this.name = 'VisualIdentificationError';
    this.httpStatus = details.httpStatus;
    this.endpointUrl = details.endpointUrl;
    this.rawResponseText = details.rawResponseText;
  }
}

/**
 * Executes photo-based visual product identification.
 * Primary endpoint: /api/barcode/photo-identify
 * Fallback endpoint: /api/photo-identify
 * Uses multimodal Gemini Flash models to visually inspect product packaging.
 */
export async function handleVisualIdentification(
  imageBase64: string,
  barcode?: string
): Promise<{
  barcode: string;
  found: boolean;
  rawText: string;
  brand?: string;
  productName?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  source: 'photo_identification';
  foundViaLabel: string;
  confidence?: string;
  isPhotoId: boolean;
  modelUsed?: string;
  manufacturer?: {
    companyName?: string;
    source: 'gemini_web' | 'not_available';
  };
}> {
  const endpoints = ['/api/barcode/photo-identify', '/api/photo-identify'];
  let lastErrorDetails: VisualIdentificationApiErrorDetails | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          barcode: barcode || undefined,
        }),
      });

      const rawBodyText = await res.text();

      if (!res.ok) {
        console.error('Visual identification API call failed:', {
          httpStatus: res.status,
          statusText: res.statusText,
          endpoint,
          responseBody: rawBodyText,
        });

        let parsedErrorMsg = '';
        try {
          const jsonErr = JSON.parse(rawBodyText);
          parsedErrorMsg = jsonErr.error || jsonErr.message || '';
        } catch {
          // not json
        }

        lastErrorDetails = {
          httpStatus: res.status,
          endpointUrl: endpoint,
          rawResponseText: rawBodyText,
          errorMessage:
            parsedErrorMsg ||
            `Photo identification service returned HTTP ${res.status} (${res.statusText || 'Error'})`,
        };

        // If 404 on the first endpoint, attempt the next endpoint alias
        if (res.status === 404 && endpoint !== endpoints[endpoints.length - 1]) {
          console.warn(`Endpoint ${endpoint} returned 404, attempting fallback endpoint...`);
          continue;
        }

        throw new VisualIdentificationError(lastErrorDetails);
      }

      let data: any;
      try {
        data = JSON.parse(rawBodyText);
      } catch (parseErr: any) {
        console.error('Failed to parse visual identification JSON response:', parseErr);
        throw new VisualIdentificationError({
          httpStatus: res.status,
          endpointUrl: endpoint,
          rawResponseText: rawBodyText,
          errorMessage: 'Server returned invalid JSON response for photo identification',
        });
      }

      return {
        barcode: barcode || data.barcode || 'PHOTO_ID',
        found: Boolean(data.found),
        rawText: data.rawText || '',
        brand: data.brand,
        productName: data.productName,
        category: data.category,
        description: data.description,
        imageUrl: imageBase64,
        source: 'photo_identification',
        foundViaLabel: data.foundViaLabel || 'Identified from photo — verify details independently',
        confidence: data.confidence,
        isPhotoId: true,
        modelUsed: data.modelUsed,
        manufacturer: data.manufacturer,
      };
    } catch (err: any) {
      if (err instanceof VisualIdentificationError) {
        throw err;
      }

      // Network or fetch connection error
      console.error('Visual identification network error:', err);
      lastErrorDetails = {
        httpStatus: undefined,
        endpointUrl: endpoint,
        rawResponseText: err.message || String(err),
        errorMessage: err.message || 'Could not connect to photo identification server',
      };

      if (endpoint === endpoints[endpoints.length - 1]) {
        throw new VisualIdentificationError(lastErrorDetails);
      }
    }
  }

  throw new VisualIdentificationError(
    lastErrorDetails || {
      httpStatus: 500,
      endpointUrl: endpoints[0],
      rawResponseText: 'Unknown error occurred during photo identification',
      errorMessage: 'Photo identification failed across all endpoints',
    }
  );
}
export async function detectNativeBarcodeSupport(): Promise<{
  supported: boolean;
  formats: string[];
}> {
  if (typeof window === 'undefined') {
    return { supported: false, formats: [] };
  }

  const hasBarcodeDetector = 'BarcodeDetector' in window;
  if (!hasBarcodeDetector) {
    return { supported: false, formats: [] };
  }

  try {
    const BarcodeDetectorClass = (window as unknown as {
      BarcodeDetector: {
        getSupportedFormats: () => Promise<string[]>;
      };
    }).BarcodeDetector;

    if (typeof BarcodeDetectorClass?.getSupportedFormats === 'function') {
      const allFormats = await BarcodeDetectorClass.getSupportedFormats();
      const matched = TARGET_BARCODE_FORMATS.filter((fmt) =>
        allFormats.includes(fmt)
      );
      if (matched.length > 0) {
        return { supported: true, formats: matched };
      }
    }
    // If getSupportedFormats is not implemented or returned empty, return supported with target list
    return { supported: true, formats: TARGET_BARCODE_FORMATS };
  } catch (err) {
    console.warn('Error detecting BarcodeDetector formats:', err);
    return { supported: false, formats: [] };
  }
}
