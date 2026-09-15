export interface BarcodeResult {
  code: string;
  format: string;
  timestamp: Date;
  source: 'native' | 'html5-qrcode' | 'manual';
}

export type ScannerStatus =
  | 'idle'
  | 'initializing'
  | 'scanning'
  | 'detected'
  | 'permission_denied'
  | 'error';

export interface ScannerEngineInfo {
  type: 'native' | 'html5-qrcode';
  supportedFormats: string[];
}

export interface NutritionItem {
  name: string;
  per100g: number | string | null;
  perServing: number | string | null;
  unit: string;
}

export interface ManufacturerInfo {
  companyName?: string;
  manufacturingPlaces?: string;
  origins?: string;
  stores?: string;
  countries?: string;
  source: 'openfoodfacts' | 'gemini_web' | 'not_available';
}

export interface BatchExpiryRecord {
  barcode: string;
  batchNumber?: string;
  manufactureDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  source: 'gs1_barcode' | 'manual_entry';
  rawGS1String?: string;
  updatedAt: number;
}

export interface PriceRecord {
  id: string;
  barcode: string;
  price: number;
  currencySymbol: string;
  formattedPrice: string;
  storeName: string;
  timestamp: number;
}

export interface ProductData {
  code: string;
  productName: string;
  brands: string;
  quantity?: string;
  imageUrl?: string;
  ingredientsText?: string;
  nutriscoreGrade?: string; // 'a' | 'b' | 'c' | 'd' | 'e'
  nutriscoreScore?: number;
  novaGroup?: number; // 1, 2, 3, 4
  ecoscoreGrade?: string; // 'a' | 'b' | 'c' | 'd' | 'e'
  servingSize?: string;
  manufacturer?: ManufacturerInfo;
  nutriments: {
    energyKcal100g?: number | null;
    energyKcalServing?: number | null;
    fat100g?: number | null;
    fatServing?: number | null;
    saturatedFat100g?: number | null;
    saturatedFatServing?: number | null;
    sugars100g?: number | null;
    sugarsServing?: number | null;
    salt100g?: number | null;
    saltServing?: number | null;
    proteins100g?: number | null;
    proteinsServing?: number | null;
    fiber100g?: number | null;
    fiberServing?: number | null;
  };
  allergens: string[];
  additives: Array<{ id: string; name: string }>;
  raw?: Record<string, unknown>;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface HistoryScanItem {
  id: string;
  barcode: string;
  timestamp: number;
  productName: string;
  brand?: string;
  imageUrl?: string;
  source: 'openfoodfacts' | 'gemini_fallback' | 'not_found';
  isFavorite: boolean;
  cachedProduct?: ProductData | null;
  cachedGeminiResult?: GeminiProductResult | null;
}

export interface UserDietaryProfile {
  allergens: {
    peanuts: boolean;
    treeNuts: boolean;
    dairy: boolean;
    egg: boolean;
    gluten: boolean;
    soy: boolean;
    shellfish: boolean;
    sesame: boolean;
  };
  customAllergens: string; // e.g. "mustard, sulfites, kiwi"
  dietaryFlags: {
    vegan: boolean;
    vegetarian: boolean;
    halal: boolean;
    kosher: boolean;
    lowSodium: boolean;
    diabeticFriendly: boolean;
  };
  isConfigured: boolean;
}

export type AllergenKey = keyof UserDietaryProfile['allergens'];
export type DietaryFlagKey = keyof UserDietaryProfile['dietaryFlags'];

export interface AllergenViolation {
  category: 'allergen' | 'custom' | 'dietary';
  name: string; // e.g. "Dairy", "Peanuts", "Vegan"
  trigger: string; // e.g. "Found 'whey powder' in ingredients"
  severity: 'danger' | 'warning';
}

export interface AllergenCheckResult {
  hasViolations: boolean;
  violations: AllergenViolation[];
  isUnknownFallback: boolean;
  hasActiveProfile: boolean;
}

export interface NotedAdditive {
  id: string; // e.g. "E129", "HFCS"
  name: string; // e.g. "Red 40 (Allura Red AC)"
  note: string; // Factual neutral one-line note
  foundIn: 'additives_list' | 'ingredients_text';
}

export interface GeminiProductResult {
  barcode: string;
  found: boolean;
  rawText: string;
  brand?: string;
  productName?: string;
  category?: string;
  priceRange?: string;
  description?: string;
  manufacturer?: ManufacturerInfo;
  sources: GroundingSource[];
}

export type ProductFetchStatus =
  | 'idle'
  | 'loading'
  | 'found'
  | 'gemini_searching'
  | 'gemini_found'
  | 'gemini_not_found'
  | 'not_found'
  | 'network_error';
