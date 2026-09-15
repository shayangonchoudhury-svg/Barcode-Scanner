import {
  ProductData,
  GeminiProductResult,
  UserDietaryProfile,
  AllergenCheckResult,
  AllergenViolation,
  NotedAdditive,
  AllergenKey,
  DietaryFlagKey,
} from '../types';

export const LOCAL_STORAGE_PROFILE_KEY = 'barcode_scanner_dietary_profile';

export const DEFAULT_USER_PROFILE: UserDietaryProfile = {
  allergens: {
    peanuts: false,
    treeNuts: false,
    dairy: false,
    egg: false,
    gluten: false,
    soy: false,
    shellfish: false,
    sesame: false,
  },
  customAllergens: '',
  dietaryFlags: {
    vegan: false,
    vegetarian: false,
    halal: false,
    kosher: false,
    lowSodium: false,
    diabeticFriendly: false,
  },
  isConfigured: false,
};

/**
 * Reads user dietary profile from localStorage with fallback to default
 */
export function getUserDietaryProfile(): UserDietaryProfile {
  if (typeof window === 'undefined') return DEFAULT_USER_PROFILE;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      allergens: {
        ...DEFAULT_USER_PROFILE.allergens,
        ...(parsed.allergens || {}),
      },
      customAllergens: parsed.customAllergens || '',
      dietaryFlags: {
        ...DEFAULT_USER_PROFILE.dietaryFlags,
        ...(parsed.dietaryFlags || {}),
      },
      isConfigured: Boolean(parsed.isConfigured),
    };
  } catch (err) {
    console.warn('Failed to parse dietary profile from localStorage:', err);
    return DEFAULT_USER_PROFILE;
  }
}

/**
 * Saves user dietary profile to localStorage
 */
export function saveUserDietaryProfile(profile: UserDietaryProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to save dietary profile to localStorage:', err);
  }
}

/**
 * Returns true if the user has at least one active allergen or dietary restriction
 */
export function hasActiveRestrictions(profile: UserDietaryProfile): boolean {
  const allergenCount = Object.values(profile.allergens).filter(Boolean).length;
  const flagCount = Object.values(profile.dietaryFlags).filter(Boolean).length;
  const customCount = profile.customAllergens
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  return allergenCount + flagCount + customCount > 0;
}

/**
 * Returns the count of total active constraints
 */
export function getActiveRestrictionsCount(profile: UserDietaryProfile): number {
  const allergenCount = Object.values(profile.allergens).filter(Boolean).length;
  const flagCount = Object.values(profile.dietaryFlags).filter(Boolean).length;
  const customCount = profile.customAllergens
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  return allergenCount + flagCount + customCount;
}

// ---------------------------------------------------------------------------
// Allergen Keywords Reference
// ---------------------------------------------------------------------------

interface AllergenDefinition {
  name: string;
  keywords: string[];
}

export const COMMON_ALLERGEN_DEFINITIONS: Record<
  keyof UserDietaryProfile['allergens'],
  AllergenDefinition
> = {
  peanuts: {
    name: 'Peanuts',
    keywords: [
      'peanut',
      'peanuts',
      'arachis',
      'groundnut',
      'groundnuts',
      'goober',
      'goobers',
      'cacahuete',
      'arachide',
      'peanut butter',
      'peanut oil',
      'peanut flour',
    ],
  },
  treeNuts: {
    name: 'Tree Nuts',
    keywords: [
      'almond',
      'almonds',
      'walnut',
      'walnuts',
      'cashew',
      'cashews',
      'pecan',
      'pecans',
      'hazelnut',
      'hazelnuts',
      'pistachio',
      'pistachios',
      'macadamia',
      'macadamias',
      'brazil nut',
      'brazil nuts',
      'chestnut',
      'chestnuts',
      'pine nut',
      'pine nuts',
      'praline',
      'filbert',
      'anacardium',
      'shea nut',
      'ginkgo nut',
    ],
  },
  dairy: {
    name: 'Dairy / Milk',
    keywords: [
      'milk',
      'dairy',
      'cream',
      'butter',
      'cheese',
      'whey',
      'casein',
      'caseinate',
      'lactose',
      'yogurt',
      'yoghurt',
      'ghee',
      'buttermilk',
      'curd',
      'curds',
      'lactalbumin',
      'lactoglobulin',
      'custard',
      'sour cream',
      'condensed milk',
      'evaporated milk',
      'crème',
      'creme',
      'fromage',
    ],
  },
  egg: {
    name: 'Egg',
    keywords: [
      'egg',
      'eggs',
      'albumen',
      'albumin',
      'ovalbumin',
      'egg yolk',
      'egg white',
      'mayonnaise',
      'meringue',
      'lysozyme',
      'ovomucoid',
      'globulin',
      'livetin',
      'oeuf',
    ],
  },
  gluten: {
    name: 'Gluten / Wheat',
    keywords: [
      'gluten',
      'wheat',
      'barley',
      'rye',
      'spelt',
      'kamut',
      'triticale',
      'semolina',
      'durum',
      'farro',
      'couscous',
      'malt',
      'bulgur',
      'graham flour',
      'atta',
      'seitan',
      'wheat flour',
      'ble',
      'froment',
    ],
  },
  soy: {
    name: 'Soy',
    keywords: [
      'soy',
      'soya',
      'soybean',
      'soybeans',
      'edamame',
      'tofu',
      'tempeh',
      'soy lecithin',
      'soya lecithin',
      'miso',
      'shoyu',
      'tamari',
      'soy protein',
      'soja',
    ],
  },
  shellfish: {
    name: 'Shellfish / Crustaceans',
    keywords: [
      'shellfish',
      'shrimp',
      'prawn',
      'prawns',
      'crab',
      'crabs',
      'lobster',
      'lobsters',
      'crayfish',
      'krill',
      'oyster',
      'oysters',
      'clam',
      'clams',
      'mussel',
      'mussels',
      'scallop',
      'scallops',
      'squid',
      'calamari',
      'octopus',
      'snail',
      'escargot',
      'crustacean',
      'crustaceans',
      'mollusc',
      'molluscs',
      'mollusk',
    ],
  },
  sesame: {
    name: 'Sesame',
    keywords: [
      'sesame',
      'sesamum',
      'tahini',
      'tahina',
      'gomasio',
      'til',
      'benne',
      'gingelly',
      'sesame seed',
      'sesame oil',
    ],
  },
};

// ---------------------------------------------------------------------------
// Dietary Restrictions Reference
// ---------------------------------------------------------------------------

const NON_VEGAN_KEYWORDS = [
  'meat',
  'poultry',
  'beef',
  'pork',
  'chicken',
  'turkey',
  'lamb',
  'veal',
  'bacon',
  'ham',
  'lard',
  'tallow',
  'suet',
  'gelatin',
  'gelatine',
  'fish',
  'salmon',
  'tuna',
  'anchovy',
  'anchovies',
  'carmine',
  'cochineal',
  'e120',
  'shellac',
  'e904',
  'isinglass',
  'honey',
  'beeswax',
  'e901',
  'milk',
  'butter',
  'cheese',
  'whey',
  'casein',
  'caseinate',
  'egg',
  'eggs',
  'collagen',
  'rennet',
  'pepsin',
];

const NON_VEGETARIAN_KEYWORDS = [
  'meat',
  'poultry',
  'beef',
  'pork',
  'chicken',
  'turkey',
  'lamb',
  'veal',
  'bacon',
  'ham',
  'lard',
  'tallow',
  'suet',
  'gelatin',
  'gelatine',
  'fish',
  'salmon',
  'tuna',
  'anchovy',
  'anchovies',
  'carmine',
  'cochineal',
  'e120',
  'isinglass',
  'collagen',
  'animal rennet',
];

const NON_HALAL_KEYWORDS = [
  'pork',
  'bacon',
  'ham',
  'swine',
  'porcine',
  'lard',
  'boar',
  'alcohol',
  'ethanol',
  'wine',
  'beer',
  'liquor',
  'rum',
  'carmine',
  'cochineal',
  'e120',
];

const NON_KOSHER_KEYWORDS = [
  'pork',
  'bacon',
  'ham',
  'swine',
  'porcine',
  'lard',
  'shrimp',
  'crab',
  'lobster',
  'oyster',
  'clam',
  'mussel',
  'scallop',
  'squid',
  'octopus',
  'shellfish',
  'crawfish',
];

// ---------------------------------------------------------------------------
// Commonly-Avoided Additives Reference
// (Neutral, factual one-line notes as requested)
// ---------------------------------------------------------------------------

export interface AdditiveSpec {
  keys: string[]; // E-numbers, names, abbreviations
  id: string;
  name: string;
  note: string;
}

export const COMMONLY_AVOIDED_ADDITIVES: AdditiveSpec[] = [
  {
    keys: ['e129', '129', 'red 40', 'allura red', 'allura red ac', 'red dye 40', 'fd&c red no. 40'],
    id: 'E129',
    name: 'Red 40 (Allura Red AC)',
    note: 'Synthetic red azo food dye manufactured from petroleum distillates.',
  },
  {
    keys: ['e102', '102', 'yellow 5', 'tartrazine', 'yellow dye 5', 'fd&c yellow no. 5'],
    id: 'E102',
    name: 'Yellow 5 (Tartrazine)',
    note: 'Synthetic lemon-yellow azo food dye used in beverages, confectionery, and snacks.',
  },
  {
    keys: ['e110', '110', 'yellow 6', 'sunset yellow', 'sunset yellow fcf', 'fd&c yellow no. 6'],
    id: 'E110',
    name: 'Yellow 6 (Sunset Yellow FCF)',
    note: 'Petroleum-derived synthetic orange-yellow azo dye used in processed foods and sweets.',
  },
  {
    keys: ['e133', '133', 'blue 1', 'brilliant blue', 'brilliant blue fcf', 'fd&c blue no. 1'],
    id: 'E133',
    name: 'Blue 1 (Brilliant Blue FCF)',
    note: 'Synthetic blue triphenylmethane dye used for vibrant blue and green coloring.',
  },
  {
    keys: ['e171', '171', 'titanium dioxide'],
    id: 'E171',
    name: 'Titanium Dioxide',
    note: 'Inorganic mineral pigment used as a whitening and opacity agent.',
  },
  {
    keys: ['e951', '951', 'aspartame'],
    id: 'E951',
    name: 'Aspartame',
    note: 'Intense low-calorie artificial sweetener, approximately 200 times sweeter than sucrose.',
  },
  {
    keys: ['e950', '950', 'acesulfame k', 'acesulfame potassium', 'ace-k'],
    id: 'E950',
    name: 'Acesulfame K',
    note: 'Calorie-free artificial sweetener often blended with aspartame or sucralose.',
  },
  {
    keys: ['e955', '955', 'sucralose', 'splenda'],
    id: 'E955',
    name: 'Sucralose',
    note: 'Zero-calorie chlorinated artificial sweetener approximately 600 times sweeter than sugar.',
  },
  {
    keys: ['e621', '621', 'monosodium glutamate', 'msg'],
    id: 'E621',
    name: 'Monosodium Glutamate (MSG)',
    note: 'Sodium salt of glutamic acid used as a savory umami flavor enhancer.',
  },
  {
    keys: [
      'high-fructose corn syrup',
      'high fructose corn syrup',
      'hfcs',
      'glucose-fructose syrup',
      'glucose fructose syrup',
      'isoglucose',
    ],
    id: 'HFCS',
    name: 'High-Fructose Corn Syrup',
    note: 'Corn-derived liquid sweetener processed to convert glucose into high levels of fructose.',
  },
  {
    keys: ['e250', '250', 'sodium nitrite', 'e251', '251', 'sodium nitrate'],
    id: 'E250',
    name: 'Sodium Nitrite / Nitrate',
    note: 'Preservative and color fixative commonly added to cured deli meats and sausages.',
  },
  {
    keys: ['e320', '320', 'bha', 'butylated hydroxyanisole'],
    id: 'E320',
    name: 'BHA (Butylated Hydroxyanisole)',
    note: 'Synthetic phenolic antioxidant preservative used to prevent fat rancidity.',
  },
  {
    keys: ['e321', '321', 'bht', 'butylated hydroxytoluene'],
    id: 'E321',
    name: 'BHT (Butylated Hydroxytoluene)',
    note: 'Fat-soluble synthetic antioxidant food preservative used to protect shelf stability.',
  },
  {
    keys: ['e211', '211', 'sodium benzoate'],
    id: 'E211',
    name: 'Sodium Benzoate',
    note: 'Aromatic preservative commonly used to inhibit mold and yeast in acidic foods and beverages.',
  },
  {
    keys: ['e150d', '150d', 'caramel iv', 'ammonia caramel', 'sulphite ammonia caramel'],
    id: 'E150d',
    name: 'Caramel IV (Ammonia Caramel)',
    note: 'Caramel color processed under high temperature with ammonium and sulfite compounds.',
  },
];

/**
 * Helper to test if a keyword exists as a distinct word or compound phrase in target text
 */
function containsKeyword(targetText: string, keyword: string): boolean {
  if (!targetText || !keyword) return false;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match word boundary or separated by punctuation/spaces
  const regex = new RegExp(`(?:^|[\\s,;:.()\\[\\]\\/\\-])${escaped}(?:$|[\\s,;:.()\\[\\]\\/\\-])`, 'i');
  return regex.test(targetText);
}

/**
 * Extracts the snippet or ingredient context where a keyword was matched
 */
function extractMatchContext(text: string, keyword: string): string {
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  const idx = lower.indexOf(kw);
  if (idx === -1) return keyword;

  const start = Math.max(0, idx - 18);
  const end = Math.min(text.length, idx + kw.length + 18);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

/**
 * Cross-references an Open Food Facts product against the user profile.
 */
export function checkProductAgainstProfile(
  product: ProductData,
  profile: UserDietaryProfile
): AllergenCheckResult {
  const violations: AllergenViolation[] = [];
  const activeProfile = hasActiveRestrictions(profile);

  if (!activeProfile) {
    return {
      hasViolations: false,
      violations: [],
      isUnknownFallback: false,
      hasActiveProfile: false,
    };
  }

  const ingredients = (product.ingredientsText || '').toLowerCase();
  const rawAllergenTags = (product.allergens || []).map((a) => a.toLowerCase());
  const allergenTagsCombined = rawAllergenTags.join(' ');
  const fullSearchText = `${ingredients} ${allergenTagsCombined}`;

  // 1. Check Common Allergens
  for (const [key, enabled] of Object.entries(profile.allergens)) {
    if (!enabled) continue;
    const def = COMMON_ALLERGEN_DEFINITIONS[key as keyof UserDietaryProfile['allergens']];
    if (!def) continue;

    let matchedKeyword: string | null = null;
    for (const kw of def.keywords) {
      if (containsKeyword(fullSearchText, kw)) {
        matchedKeyword = kw;
        break;
      }
    }

    if (matchedKeyword) {
      const triggerSnippet = ingredients
        ? extractMatchContext(product.ingredientsText || '', matchedKeyword)
        : `Tagged as containing ${matchedKeyword}`;

      violations.push({
        category: 'allergen',
        name: def.name,
        trigger: `Matched '${matchedKeyword}' (${triggerSnippet})`,
        severity: 'danger',
      });
    }
  }

  // 2. Check Custom Allergens (free-text comma/newline separated)
  if (profile.customAllergens.trim()) {
    const customList = profile.customAllergens
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const customItem of customList) {
      if (containsKeyword(fullSearchText, customItem)) {
        const triggerSnippet = ingredients
          ? extractMatchContext(product.ingredientsText || '', customItem)
          : `Matched custom keyword '${customItem}'`;

        violations.push({
          category: 'custom',
          name: `Custom: "${customItem}"`,
          trigger: `Detected in ingredients (${triggerSnippet})`,
          severity: 'danger',
        });
      }
    }
  }

  // 3. Check Dietary Flags
  // Vegan
  if (profile.dietaryFlags.vegan) {
    let nonVeganMatch: string | null = null;
    for (const kw of NON_VEGAN_KEYWORDS) {
      if (containsKeyword(fullSearchText, kw)) {
        nonVeganMatch = kw;
        break;
      }
    }
    if (nonVeganMatch) {
      violations.push({
        category: 'dietary',
        name: 'Vegan Restriction',
        trigger: `Contains non-vegan ingredient '${nonVeganMatch}'`,
        severity: 'danger',
      });
    }
  }

  // Vegetarian
  if (profile.dietaryFlags.vegetarian) {
    let nonVegMatch: string | null = null;
    for (const kw of NON_VEGETARIAN_KEYWORDS) {
      if (containsKeyword(fullSearchText, kw)) {
        nonVegMatch = kw;
        break;
      }
    }
    if (nonVegMatch) {
      violations.push({
        category: 'dietary',
        name: 'Vegetarian Restriction',
        trigger: `Contains meat/animal ingredient '${nonVegMatch}'`,
        severity: 'danger',
      });
    }
  }

  // Halal
  if (profile.dietaryFlags.halal) {
    let nonHalalMatch: string | null = null;
    for (const kw of NON_HALAL_KEYWORDS) {
      if (containsKeyword(fullSearchText, kw)) {
        nonHalalMatch = kw;
        break;
      }
    }
    if (nonHalalMatch) {
      violations.push({
        category: 'dietary',
        name: 'Halal Restriction',
        trigger: `Contains non-halal ingredient '${nonHalalMatch}'`,
        severity: 'danger',
      });
    }
  }

  // Kosher
  if (profile.dietaryFlags.kosher) {
    let nonKosherMatch: string | null = null;
    for (const kw of NON_KOSHER_KEYWORDS) {
      if (containsKeyword(fullSearchText, kw)) {
        nonKosherMatch = kw;
        break;
      }
    }
    if (nonKosherMatch) {
      violations.push({
        category: 'dietary',
        name: 'Kosher Restriction',
        trigger: `Contains non-kosher item '${nonKosherMatch}'`,
        severity: 'danger',
      });
    }
  }

  // Low Sodium (guideline: >1.5g salt / 100g is officially high salt, FDA/NHS)
  if (profile.dietaryFlags.lowSodium) {
    const salt100g = product.nutriments.salt100g;
    if (salt100g !== null && salt100g !== undefined && salt100g > 1.2) {
      violations.push({
        category: 'dietary',
        name: 'Low-Sodium Diet',
        trigger: `High salt content: ${salt100g}g per 100g (exceeds recommended ≤0.3g low-salt threshold)`,
        severity: 'warning',
      });
    }
  }

  // Diabetic-Friendly (high sugar content: >15g sugars / 100g or prominent high-glycemic syrups)
  if (profile.dietaryFlags.diabeticFriendly) {
    const sugars100g = product.nutriments.sugars100g;
    if (sugars100g !== null && sugars100g !== undefined && sugars100g > 15) {
      violations.push({
        category: 'dietary',
        name: 'Diabetic-Friendly Diet',
        trigger: `High sugar content: ${sugars100g}g sugars per 100g (exceeds ≤5g low-sugar benchmark)`,
        severity: 'warning',
      });
    } else if (
      containsKeyword(fullSearchText, 'high fructose corn syrup') ||
      containsKeyword(fullSearchText, 'glucose-fructose syrup')
    ) {
      violations.push({
        category: 'dietary',
        name: 'Diabetic-Friendly Diet',
        trigger: 'Contains concentrated high-fructose / glucose syrup',
        severity: 'warning',
      });
    }
  }

  return {
    hasViolations: violations.length > 0,
    violations,
    isUnknownFallback: false,
    hasActiveProfile: activeProfile,
  };
}

/**
 * Cross-references a Gemini / Web Search fallback result against user profile.
 * If text contains an allergen keyword, flags it.
 * If no detailed ingredients are present, sets `isUnknownFallback: true` so the user is informed
 * that ingredient data could not be verified.
 */
export function checkGeminiResultAgainstProfile(
  geminiResult: GeminiProductResult,
  profile: UserDietaryProfile
): AllergenCheckResult {
  const activeProfile = hasActiveRestrictions(profile);

  if (!activeProfile) {
    return {
      hasViolations: false,
      violations: [],
      isUnknownFallback: false,
      hasActiveProfile: false,
    };
  }

  const combinedText = `${geminiResult.productName || ''} ${geminiResult.brand || ''} ${
    geminiResult.category || ''
  } ${geminiResult.description || ''} ${geminiResult.rawText || ''}`.toLowerCase();

  const violations: AllergenViolation[] = [];

  // 1. Check Common Allergens in text
  for (const [key, enabled] of Object.entries(profile.allergens)) {
    if (!enabled) continue;
    const def = COMMON_ALLERGEN_DEFINITIONS[key as keyof UserDietaryProfile['allergens']];
    if (!def) continue;

    for (const kw of def.keywords) {
      if (containsKeyword(combinedText, kw)) {
        violations.push({
          category: 'allergen',
          name: def.name,
          trigger: `Detected '${kw}' mentioned in search product summary`,
          severity: 'danger',
        });
        break;
      }
    }
  }

  // 2. Custom Allergens
  if (profile.customAllergens.trim()) {
    const customList = profile.customAllergens
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const customItem of customList) {
      if (containsKeyword(combinedText, customItem)) {
        violations.push({
          category: 'custom',
          name: `Custom: "${customItem}"`,
          trigger: `Detected '${customItem}' in search summary`,
          severity: 'danger',
        });
      }
    }
  }

  // 3. Dietary Flags in text
  if (profile.dietaryFlags.vegan) {
    for (const kw of NON_VEGAN_KEYWORDS) {
      if (containsKeyword(combinedText, kw)) {
        violations.push({
          category: 'dietary',
          name: 'Vegan Restriction',
          trigger: `Detected non-vegan term '${kw}' in product text`,
          severity: 'danger',
        });
        break;
      }
    }
  }

  if (profile.dietaryFlags.vegetarian) {
    for (const kw of NON_VEGETARIAN_KEYWORDS) {
      if (containsKeyword(combinedText, kw)) {
        violations.push({
          category: 'dietary',
          name: 'Vegetarian Restriction',
          trigger: `Detected meat/fish term '${kw}' in product text`,
          severity: 'danger',
        });
        break;
      }
    }
  }

  if (profile.dietaryFlags.halal) {
    for (const kw of NON_HALAL_KEYWORDS) {
      if (containsKeyword(combinedText, kw)) {
        violations.push({
          category: 'dietary',
          name: 'Halal Restriction',
          trigger: `Detected prohibited ingredient '${kw}' in product text`,
          severity: 'danger',
        });
        break;
      }
    }
  }

  if (profile.dietaryFlags.kosher) {
    for (const kw of NON_KOSHER_KEYWORDS) {
      if (containsKeyword(combinedText, kw)) {
        violations.push({
          category: 'dietary',
          name: 'Kosher Restriction',
          trigger: `Detected non-kosher item '${kw}' in product text`,
          severity: 'danger',
        });
        break;
      }
    }
  }

  // Always mark isUnknownFallback as true for web search results when profile is active,
  // so the neutral "could not verify allergens" notice is displayed if no specific positive violation was triggered.
  return {
    hasViolations: violations.length > 0,
    violations,
    isUnknownFallback: true,
    hasActiveProfile: activeProfile,
  };
}

/**
 * Inspects an Open Food Facts product for any commonly-avoided additives
 * and returns neutral, factual one-line notes.
 */
export function findNotedAdditives(product: ProductData): NotedAdditive[] {
  const detected: NotedAdditive[] = [];
  const seenIds = new Set<string>();

  const ingredients = (product.ingredientsText || '').toLowerCase();
  const additivesFromOff = product.additives || [];

  for (const spec of COMMONLY_AVOIDED_ADDITIVES) {
    let foundIn: 'additives_list' | 'ingredients_text' | null = null;

    // Check OFF structured additives tags
    for (const offAdd of additivesFromOff) {
      const cleanId = offAdd.id.toLowerCase().replace(/^e/, '');
      const cleanOffFull = offAdd.id.toLowerCase();
      const cleanOffName = (offAdd.name || '').toLowerCase();

      for (const k of spec.keys) {
        if (
          cleanId === k ||
          cleanOffFull === k ||
          cleanOffName.includes(k) ||
          k === cleanOffName
        ) {
          foundIn = 'additives_list';
          break;
        }
      }
      if (foundIn) break;
    }

    // If not found in structured additives, check ingredients text
    if (!foundIn && ingredients) {
      for (const k of spec.keys) {
        if (containsKeyword(ingredients, k)) {
          foundIn = 'ingredients_text';
          break;
        }
      }
    }

    if (foundIn && !seenIds.has(spec.id)) {
      seenIds.add(spec.id);
      detected.push({
        id: spec.id,
        name: spec.name,
        note: spec.note,
        foundIn,
      });
    }
  }

  return detected;
}

export const ALLERGEN_OPTIONS: Array<{ key: AllergenKey; label: string }> = [
  { key: 'peanuts', label: 'Peanuts' },
  { key: 'treeNuts', label: 'Tree Nuts' },
  { key: 'dairy', label: 'Dairy / Milk' },
  { key: 'egg', label: 'Eggs' },
  { key: 'gluten', label: 'Gluten / Wheat' },
  { key: 'soy', label: 'Soy' },
  { key: 'shellfish', label: 'Shellfish / Fish' },
  { key: 'sesame', label: 'Sesame' },
];

export const DIETARY_FLAG_OPTIONS: Array<{ key: DietaryFlagKey; label: string }> = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
  { key: 'lowSodium', label: 'Low Sodium' },
  { key: 'diabeticFriendly', label: 'Diabetic Friendly' },
];
