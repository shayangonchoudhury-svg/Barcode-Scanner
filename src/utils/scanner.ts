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
 * Detect if native BarcodeDetector API is present and query supported formats
 */
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
