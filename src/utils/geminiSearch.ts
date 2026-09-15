import { GeminiProductResult } from '../types';

export async function lookupBarcodeWithGemini(
  barcode: string
): Promise<GeminiProductResult> {
  const cleanCode = barcode.trim();

  const response = await fetch('/api/barcode/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ barcode: cleanCode }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData.error || `Gemini search failed with status ${response.status}`
    );
  }

  return response.json();
}
