import { ProductData } from '../types';

// In-memory session cache so re-scanning the same code doesn't refetch
const sessionProductCache = new Map<string, ProductData>();

export interface FetchProductResult {
  status: 'found' | 'not_found' | 'network_error';
  product?: ProductData;
  error?: string;
}

/**
 * Common E-number additives names reference for friendlier display
 */
const ADDITIVE_NAMES: Record<string, string> = {
  e100: 'Curcumin',
  e150a: 'Plain Caramel',
  e160a: 'Carotenes',
  e171: 'Titanium Dioxide',
  e200: 'Sorbic Acid',
  e202: 'Potassium Sorbate',
  e211: 'Sodium Benzoate',
  e220: 'Sulphur Dioxide',
  e250: 'Sodium Nitrite',
  e260: 'Acetic Acid',
  e300: 'Ascorbic Acid (Vitamin C)',
  e322: 'Lecithins',
  e330: 'Citric Acid',
  e407: 'Carrageenan',
  e412: 'Guar Gum',
  e415: 'Xanthan Gum',
  e420: 'Sorbitol',
  e440: 'Pectins',
  e450: 'Diphosphates',
  e471: 'Mono- and Diglycerides of Fatty Acids',
  e500: 'Sodium Carbonates (Baking Soda)',
  e503: 'Ammonium Carbonates',
  e621: 'Monosodium Glutamate (MSG)',
  e950: 'Acesulfame K',
  e951: 'Aspartame',
  e955: 'Sucralose',
};

/**
 * Format additive tag (e.g., "en:e322", "en:e330") to clean { id: "E322", name: "Lecithins" }
 */
export function formatAdditive(tag: string): { id: string; name: string } {
  const clean = tag.replace(/^([a-z]{2}:)?/, '').toLowerCase();
  const upperId = clean.toUpperCase();
  const knownName = ADDITIVE_NAMES[clean];
  return {
    id: upperId,
    name: knownName || upperId,
  };
}

/**
 * Format allergen tag (e.g. "en:milk", "en:soybeans") to capitalized readable name
 */
export function formatAllergen(tag: string): string {
  const clean = tag.replace(/^([a-z]{2}:)?/, '').replace(/[-_]/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Nutri-Score configuration with official colors and plain-language explanation
 */
export interface ScoreDescription {
  grade: string;
  label: string;
  bgColor: string;
  textColor: string;
  explanation: string;
}

export function getNutriScoreInfo(grade?: string): ScoreDescription | null {
  if (!grade) return null;
  const g = grade.toLowerCase();
  switch (g) {
    case 'a':
      return {
        grade: 'A',
        label: 'Nutri-Score A',
        bgColor: 'bg-emerald-600',
        textColor: 'text-emerald-100',
        explanation: 'Very good nutritional quality — low in sugars, saturated fat, and sodium.',
      };
    case 'b':
      return {
        grade: 'B',
        label: 'Nutri-Score B',
        bgColor: 'bg-lime-500',
        textColor: 'text-zinc-950',
        explanation: 'Good nutritional quality — a balanced everyday food choice.',
      };
    case 'c':
      return {
        grade: 'C',
        label: 'Nutri-Score C',
        bgColor: 'bg-yellow-400',
        textColor: 'text-zinc-950',
        explanation: 'Moderate nutritional quality — balanced nutrients, recommended in moderation.',
      };
    case 'd':
      return {
        grade: 'D',
        label: 'Nutri-Score D',
        bgColor: 'bg-amber-600',
        textColor: 'text-amber-50',
        explanation: 'Poor nutritional quality — higher in saturated fat, salt, or sugar.',
      };
    case 'e':
      return {
        grade: 'E',
        label: 'Nutri-Score E',
        bgColor: 'bg-rose-600',
        textColor: 'text-rose-50',
        explanation: 'Unfavorable nutritional quality — high in salt, sugar, or unhealthy fats.',
      };
    default:
      return null;
  }
}

/**
 * NOVA Group configuration with official classification and plain-language explanation
 */
export function getNovaGroupInfo(group?: number | string): ScoreDescription | null {
  if (group === undefined || group === null) return null;
  const num = Number(group);
  switch (num) {
    case 1:
      return {
        grade: '1',
        label: 'NOVA Group 1',
        bgColor: 'bg-emerald-600',
        textColor: 'text-emerald-50',
        explanation: 'Unprocessed or minimally processed foods (whole grain, fresh fruits/vegetables).',
      };
    case 2:
      return {
        grade: '2',
        label: 'NOVA Group 2',
        bgColor: 'bg-yellow-500',
        textColor: 'text-zinc-950',
        explanation: 'Processed culinary ingredients (direct oils, butter, sugar, or natural salt).',
      };
    case 3:
      return {
        grade: '3',
        label: 'NOVA Group 3',
        bgColor: 'bg-amber-600',
        textColor: 'text-amber-50',
        explanation: 'Processed foods (canned vegetables, simple cheeses, freshly baked breads).',
      };
    case 4:
      return {
        grade: '4',
        label: 'NOVA Group 4',
        bgColor: 'bg-rose-600',
        textColor: 'text-rose-50',
        explanation: 'Ultra-processed food & drink formulations (industrial ingredients, additives, flavourings).',
      };
    default:
      return null;
  }
}

/**
 * Eco-Score configuration
 */
export function getEcoScoreInfo(grade?: string): ScoreDescription | null {
  if (!grade) return null;
  const g = grade.toLowerCase();
  switch (g) {
    case 'a':
      return {
        grade: 'A',
        label: 'Eco-Score A',
        bgColor: 'bg-emerald-600',
        textColor: 'text-emerald-50',
        explanation: 'Very low environmental impact lifecycle.',
      };
    case 'b':
      return {
        grade: 'B',
        label: 'Eco-Score B',
        bgColor: 'bg-teal-500',
        textColor: 'text-zinc-950',
        explanation: 'Low environmental impact footprint.',
      };
    case 'c':
      return {
        grade: 'C',
        label: 'Eco-Score C',
        bgColor: 'bg-amber-500',
        textColor: 'text-zinc-950',
        explanation: 'Moderate environmental impact.',
      };
    case 'd':
      return {
        grade: 'D',
        label: 'Eco-Score D',
        bgColor: 'bg-orange-600',
        textColor: 'text-orange-50',
        explanation: 'High environmental footprint across lifecycle.',
      };
    case 'e':
      return {
        grade: 'E',
        label: 'Eco-Score E',
        bgColor: 'bg-rose-600',
        textColor: 'text-rose-50',
        explanation: 'Very high environmental impact on biodiversity and climate.',
      };
    default:
      return null;
  }
}

/**
 * Fetch product data from Open Food Facts API v2
 * Cached in memory for the session
 */
export async function fetchOpenFoodFactsProduct(
  barcode: string
): Promise<FetchProductResult> {
  const cleanCode = barcode.trim();
  if (!cleanCode) {
    return { status: 'not_found' };
  }

  // Check in-memory session cache first
  if (sessionProductCache.has(cleanCode)) {
    return {
      status: 'found',
      product: sessionProductCache.get(cleanCode),
    };
  }

  const endpoint = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BarcodeScannerApp - OpenFoodFacts - Version 1.0',
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status >= 500) {
      return {
        status: 'network_error',
        error: `Open Food Facts server error (${response.status})`,
      };
    }

    const data = await response.json();

    // Check status per requirements:
    // "If status is not "1" (product not found), call handleProductNotFound(code)"
    if (data.status !== 1 || !data.product) {
      return {
        status: 'not_found',
      };
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    // Map ingredients text (fallback chain)
    const ingredients =
      p.ingredients_text ||
      p.ingredients_text_en ||
      p.ingredients_text_with_allergens ||
      p.ingredients_text_fr ||
      '';

    // Parse allergens list
    const allergensTags: string[] = Array.isArray(p.allergens_tags)
      ? p.allergens_tags
      : Array.isArray(p.allergens_hierarchy)
      ? p.allergens_hierarchy
      : typeof p.allergens === 'string' && p.allergens.trim()
      ? p.allergens.split(',').map((s: string) => s.trim())
      : [];

    const cleanAllergens = Array.from(
      new Set(allergensTags.map((a: string) => formatAllergen(a)).filter(Boolean))
    );

    // Parse additives list
    const rawAdditives: string[] = Array.isArray(p.additives_tags)
      ? p.additives_tags
      : Array.isArray(p.additives_original_tags)
      ? p.additives_original_tags
      : [];

    const cleanAdditives = Array.from(
      new Map(
        rawAdditives.map((item: string) => {
          const formatted = formatAdditive(item);
          return [formatted.id, formatted];
        })
      ).values()
    );

    // Extract Manufacturer information strictly without guessing
    const rawBrands = p.brands || (Array.isArray(p.brands_tags) && p.brands_tags.length ? p.brands_tags.join(', ') : '') || '';
    const rawMfgPlaces = p.manufacturing_places || (Array.isArray(p.manufacturing_places_tags) && p.manufacturing_places_tags.length ? p.manufacturing_places_tags.join(', ') : '') || p.emb_codes || (Array.isArray(p.emb_codes_tags) && p.emb_codes_tags.length ? p.emb_codes_tags.join(', ') : '') || '';
    const rawOrigins = p.origins || (Array.isArray(p.origins_tags) && p.origins_tags.length ? p.origins_tags.join(', ') : '') || '';
    const rawStores = p.stores || (Array.isArray(p.stores_tags) && p.stores_tags.length ? p.stores_tags.join(', ') : '') || '';
    const rawCountries = p.countries || (Array.isArray(p.countries_tags) && p.countries_tags.length ? p.countries_tags.map((c: string) => c.replace(/^[a-z]{2}:/, '').replace(/[-_]/g, ' ')).join(', ') : '') || '';

    // Country of origin fallback per prompt: origins if present, countries_tags as a fallback
    const effectiveOrigin = rawOrigins || rawCountries;

    const hasAnyManufacturerInfo = Boolean(
      rawBrands.trim() || rawMfgPlaces.trim() || effectiveOrigin.trim() || rawStores.trim()
    );

    const manufacturerInfo = {
      companyName: rawBrands.trim() || undefined,
      manufacturingPlaces: rawMfgPlaces.trim() || undefined,
      origins: effectiveOrigin.trim() || undefined,
      stores: rawStores.trim() || undefined,
      countries: rawCountries.trim() || undefined,
      source: hasAnyManufacturerInfo ? ('openfoodfacts' as const) : ('not_available' as const),
    };

    const productResult: ProductData = {
      code: cleanCode,
      productName: p.product_name || p.product_name_en || 'Unknown Product',
      brands: p.brands || p.brands_tags?.join(', ') || 'Unknown Brand',
      quantity: p.quantity || p.product_quantity || undefined,
      imageUrl: p.image_front_url || p.image_url || p.selected_images?.front?.display?.en || undefined,
      ingredientsText: ingredients || undefined,
      nutriscoreGrade: p.nutriscore_grade || p.nutrition_grades || undefined,
      nutriscoreScore: p.nutriscore_score,
      novaGroup: p.nova_group !== undefined ? Number(p.nova_group) : undefined,
      ecoscoreGrade: p.ecoscore_grade || undefined,
      servingSize: p.serving_size || undefined,
      lookupSource: 'openfoodfacts',
      foundViaLabel: 'Found via: Open Food Facts',
      manufacturer: manufacturerInfo,
      nutriments: {
        energyKcal100g: nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal_value'] ?? null,
        energyKcalServing: nutriments['energy-kcal_serving'] ?? null,
        fat100g: nutriments['fat_100g'] ?? nutriments['fat_value'] ?? null,
        fatServing: nutriments['fat_serving'] ?? null,
        saturatedFat100g: nutriments['saturated-fat_100g'] ?? nutriments['saturated-fat_value'] ?? null,
        saturatedFatServing: nutriments['saturated-fat_serving'] ?? null,
        sugars100g: nutriments['sugars_100g'] ?? nutriments['sugars_value'] ?? null,
        sugarsServing: nutriments['sugars_serving'] ?? null,
        salt100g: nutriments['salt_100g'] ?? nutriments['salt_value'] ?? null,
        saltServing: nutriments['salt_serving'] ?? null,
        proteins100g: nutriments['proteins_100g'] ?? nutriments['proteins_value'] ?? null,
        proteinsServing: nutriments['proteins_serving'] ?? null,
        fiber100g: nutriments['fiber_100g'] ?? nutriments['fiber_value'] ?? null,
        fiberServing: nutriments['fiber_serving'] ?? null,
      },
      allergens: cleanAllergens,
      additives: cleanAdditives,
      raw: p,
    };

    // Store in session cache
    sessionProductCache.set(cleanCode, productResult);

    return {
      status: 'found',
      product: productResult,
    };
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error('Open Food Facts fetch failed with network error:', err);
    return {
      status: 'network_error',
      error: errorObj?.name === 'AbortError'
        ? 'Connection timed out while reaching Open Food Facts'
        : 'Network connection failed. Please check your internet connection.',
    };
  }
}
