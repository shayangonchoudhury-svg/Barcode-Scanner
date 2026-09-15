/**
 * Barcode Scanner & Open Food Facts Client (script.js)
 *
 * Full vanilla JS implementation:
 * - Native BarcodeDetector API with html5-qrcode CDN fallback
 * - Open Food Facts API v2 integration
 * - In-memory session cache
 * - Loading skeleton, Product Not Found stub, Network Error state, and detailed Product View
 */

// In-memory cache for session
const productSessionCache = new Map();

// Camera scanner state
let currentMediaStream = null;
let html5QrCodeScanner = null;
let isScanningActive = false;
let cameraAnimationFrame = null;

// Target barcode formats
const TARGET_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'qr_code',
];

// ============================================================================
// Dietary & Allergen Profile Engine (vanilla JS)
// ============================================================================

const DIETARY_STORAGE_KEY = 'barcode_scanner_dietary_profile';

const DEFAULT_PROFILE = {
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

const ALLERGEN_DICTIONARY = {
  peanuts: {
    name: 'Peanuts',
    keywords: ['peanut', 'peanuts', 'arachis', 'groundnut', 'groundnuts', 'goober', 'goobers', 'peanut butter', 'peanut oil'],
  },
  treeNuts: {
    name: 'Tree Nuts',
    keywords: ['almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'pecan', 'pecans', 'hazelnut', 'hazelnuts', 'pistachio', 'pistachios', 'macadamia', 'macadamias', 'brazil nut', 'chestnut', 'pine nut', 'praline', 'filbert'],
  },
  dairy: {
    name: 'Dairy / Milk',
    keywords: ['milk', 'dairy', 'cream', 'butter', 'cheese', 'whey', 'casein', 'caseinate', 'lactose', 'yogurt', 'yoghurt', 'ghee', 'buttermilk', 'curd', 'custard', 'sour cream'],
  },
  egg: {
    name: 'Egg',
    keywords: ['egg', 'eggs', 'albumen', 'albumin', 'ovalbumin', 'egg yolk', 'egg white', 'mayonnaise', 'meringue', 'lysozyme', 'ovomucoid'],
  },
  gluten: {
    name: 'Gluten / Wheat',
    keywords: ['gluten', 'wheat', 'barley', 'rye', 'spelt', 'kamut', 'triticale', 'semolina', 'durum', 'farro', 'couscous', 'malt', 'bulgur', 'graham flour'],
  },
  soy: {
    name: 'Soy',
    keywords: ['soy', 'soya', 'soybean', 'soybeans', 'edamame', 'tofu', 'tempeh', 'soy lecithin', 'miso', 'shoyu', 'tamari'],
  },
  shellfish: {
    name: 'Shellfish / Crustaceans',
    keywords: ['shellfish', 'shrimp', 'prawn', 'prawns', 'crab', 'crabs', 'lobster', 'lobsters', 'crayfish', 'krill', 'oyster', 'oysters', 'clam', 'clams', 'mussel', 'mussels', 'scallop', 'scallops', 'squid', 'calamari', 'octopus', 'snail', 'escargot', 'crustacean', 'mollusc', 'mollusk'],
  },
  sesame: {
    name: 'Sesame',
    keywords: ['sesame', 'sesamum', 'tahini', 'tahina', 'gomasio', 'til', 'benne', 'sesame seed', 'sesame oil'],
  },
};

const COMMONLY_AVOIDED_ADDITIVES = [
  { keys: ['e129', 'red 40', 'allura red'], id: 'E129', name: 'Red 40 (Allura Red AC)', note: 'Synthetic red azo food dye manufactured from petroleum distillates.' },
  { keys: ['e102', 'yellow 5', 'tartrazine'], id: 'E102', name: 'Yellow 5 (Tartrazine)', note: 'Synthetic lemon-yellow azo food dye used in beverages, confectionery, and snacks.' },
  { keys: ['e110', 'yellow 6', 'sunset yellow'], id: 'E110', name: 'Yellow 6 (Sunset Yellow FCF)', note: 'Petroleum-derived synthetic orange-yellow azo dye used in processed foods and sweets.' },
  { keys: ['e133', 'blue 1', 'brilliant blue'], id: 'E133', name: 'Blue 1 (Brilliant Blue FCF)', note: 'Synthetic blue triphenylmethane dye used for vibrant blue and green coloring.' },
  { keys: ['e171', 'titanium dioxide'], id: 'E171', name: 'Titanium Dioxide', note: 'Inorganic mineral pigment used as a whitening and opacity agent.' },
  { keys: ['e951', 'aspartame'], id: 'E951', name: 'Aspartame', note: 'Intense low-calorie artificial sweetener, approximately 200 times sweeter than sucrose.' },
  { keys: ['e950', 'acesulfame k', 'ace-k'], id: 'E950', name: 'Acesulfame K', note: 'Calorie-free artificial sweetener often blended with aspartame or sucralose.' },
  { keys: ['e955', 'sucralose', 'splenda'], id: 'E955', name: 'Sucralose', note: 'Zero-calorie chlorinated artificial sweetener approximately 600 times sweeter than sugar.' },
  { keys: ['e621', 'monosodium glutamate', 'msg'], id: 'E621', name: 'Monosodium Glutamate (MSG)', note: 'Sodium salt of glutamic acid used as a savory umami flavor enhancer.' },
  { keys: ['high-fructose corn syrup', 'high fructose corn syrup', 'hfcs', 'glucose-fructose syrup'], id: 'HFCS', name: 'High-Fructose Corn Syrup', note: 'Corn-derived liquid sweetener processed to convert glucose into high levels of fructose.' },
  { keys: ['e250', 'sodium nitrite', 'e251', 'sodium nitrate'], id: 'E250', name: 'Sodium Nitrite / Nitrate', note: 'Preservative and color fixative commonly added to cured deli meats and sausages.' },
  { keys: ['e320', 'bha', 'butylated hydroxyanisole'], id: 'E320', name: 'BHA (Butylated Hydroxyanisole)', note: 'Synthetic phenolic antioxidant preservative used to prevent fat rancidity.' },
  { keys: ['e321', 'bht', 'butylated hydroxytoluene'], id: 'E321', name: 'BHT (Butylated Hydroxytoluene)', note: 'Fat-soluble synthetic antioxidant food preservative used to protect shelf stability.' },
  { keys: ['e211', 'sodium benzoate'], id: 'E211', name: 'Sodium Benzoate', note: 'Aromatic preservative commonly used to inhibit mold and yeast in acidic foods and beverages.' },
];

function getDietaryProfile() {
  try {
    const raw = localStorage.getItem(DIETARY_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      allergens: { ...DEFAULT_PROFILE.allergens, ...(parsed.allergens || {}) },
      customAllergens: parsed.customAllergens || '',
      dietaryFlags: { ...DEFAULT_PROFILE.dietaryFlags, ...(parsed.dietaryFlags || {}) },
      isConfigured: Boolean(parsed.isConfigured),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveDietaryProfile(profile) {
  try {
    localStorage.setItem(DIETARY_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to save profile:', err);
  }
}

function hasActiveDietaryProfile(profile) {
  const allergenCount = Object.values(profile.allergens).filter(Boolean).length;
  const flagCount = Object.values(profile.dietaryFlags).filter(Boolean).length;
  const customCount = profile.customAllergens.split(/[,;\n]+/).filter((s) => s.trim().length > 0).length;
  return allergenCount + flagCount + customCount > 0;
}

function matchKeywordInText(text, keyword) {
  if (!text || !keyword) return false;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[\\s,;:.()\\[\\]\\/\\-])${escaped}(?:$|[\\s,;:.()\\[\\]\\/\\-])`, 'i');
  return regex.test(text);
}

function checkProductAgainstUserProfile(product, profile) {
  const violations = [];
  const hasActive = hasActiveDietaryProfile(profile);
  if (!hasActive) return { hasViolations: false, violations: [], isUnknownFallback: false, hasActive: false };

  const ingredients = (product.ingredientsText || '').toLowerCase();
  const rawAllergens = (product.allergens || []).map((a) => a.toLowerCase()).join(' ');
  const searchText = `${ingredients} ${rawAllergens}`;

  // Common Allergens
  for (const [key, enabled] of Object.entries(profile.allergens)) {
    if (!enabled) continue;
    const def = ALLERGEN_DICTIONARY[key];
    if (!def) continue;

    for (const kw of def.keywords) {
      if (matchKeywordInText(searchText, kw)) {
        violations.push({
          name: def.name,
          trigger: `Matched '${kw}' in ingredients/allergens`,
        });
        break;
      }
    }
  }

  // Custom Allergens
  if (profile.customAllergens.trim()) {
    const list = profile.customAllergens.split(/[,;\n]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    for (const custom of list) {
      if (matchKeywordInText(searchText, custom)) {
        violations.push({
          name: `Custom: "${custom}"`,
          trigger: `Detected in ingredients`,
        });
      }
    }
  }

  // Dietary Flags
  if (profile.dietaryFlags.vegan) {
    const nonVegan = ['meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'bacon', 'ham', 'lard', 'gelatin', 'fish', 'carmine', 'cochineal', 'e120', 'shellac', 'honey', 'milk', 'butter', 'cheese', 'whey', 'egg', 'eggs'];
    for (const kw of nonVegan) {
      if (matchKeywordInText(searchText, kw)) {
        violations.push({ name: 'Vegan Restriction', trigger: `Contains '${kw}'` });
        break;
      }
    }
  }

  if (profile.dietaryFlags.vegetarian) {
    const nonVeg = ['meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'bacon', 'ham', 'lard', 'gelatin', 'fish', 'carmine', 'cochineal', 'e120'];
    for (const kw of nonVeg) {
      if (matchKeywordInText(searchText, kw)) {
        violations.push({ name: 'Vegetarian Restriction', trigger: `Contains '${kw}'` });
        break;
      }
    }
  }

  if (profile.dietaryFlags.halal) {
    const nonHalal = ['pork', 'bacon', 'ham', 'swine', 'lard', 'alcohol', 'ethanol', 'wine', 'beer', 'carmine'];
    for (const kw of nonHalal) {
      if (matchKeywordInText(searchText, kw)) {
        violations.push({ name: 'Halal Restriction', trigger: `Contains prohibited item '${kw}'` });
        break;
      }
    }
  }

  if (profile.dietaryFlags.kosher) {
    const nonKosher = ['pork', 'bacon', 'ham', 'lard', 'shrimp', 'crab', 'lobster', 'oyster', 'clam', 'shellfish'];
    for (const kw of nonKosher) {
      if (matchKeywordInText(searchText, kw)) {
        violations.push({ name: 'Kosher Restriction', trigger: `Contains non-kosher item '${kw}'` });
        break;
      }
    }
  }

  if (profile.dietaryFlags.lowSodium) {
    const salt = product.nutriments ? product.nutriments.salt100g : null;
    if (salt !== null && salt !== undefined && salt > 1.2) {
      violations.push({ name: 'Low-Sodium Diet', trigger: `High salt content: ${salt}g/100g (exceeds recommended low-salt limit)` });
    }
  }

  if (profile.dietaryFlags.diabeticFriendly) {
    const sugar = product.nutriments ? product.nutriments.sugars100g : null;
    if (sugar !== null && sugar !== undefined && sugar > 15) {
      violations.push({ name: 'Diabetic-Friendly Diet', trigger: `High sugars: ${sugar}g/100g` });
    } else if (matchKeywordInText(searchText, 'high fructose corn syrup') || matchKeywordInText(searchText, 'glucose-fructose syrup')) {
      violations.push({ name: 'Diabetic-Friendly Diet', trigger: 'Contains high-fructose corn syrup' });
    }
  }

  return {
    hasViolations: violations.length > 0,
    violations,
    isUnknownFallback: false,
    hasActive,
  };
}

function checkGeminiAgainstUserProfile(data, profile) {
  const hasActive = hasActiveDietaryProfile(profile);
  if (!hasActive) return { hasViolations: false, violations: [], isUnknownFallback: false, hasActive: false };

  const fullText = `${data.productName || ''} ${data.brand || ''} ${data.description || ''} ${data.rawText || ''}`.toLowerCase();
  const violations = [];

  for (const [key, enabled] of Object.entries(profile.allergens)) {
    if (!enabled) continue;
    const def = ALLERGEN_DICTIONARY[key];
    if (!def) continue;
    for (const kw of def.keywords) {
      if (matchKeywordInText(fullText, kw)) {
        violations.push({ name: def.name, trigger: `Mentioned '${kw}' in product summary` });
        break;
      }
    }
  }

  if (profile.customAllergens.trim()) {
    const list = profile.customAllergens.split(/[,;\n]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    for (const custom of list) {
      if (matchKeywordInText(fullText, custom)) {
        violations.push({ name: `Custom: "${custom}"`, trigger: `Detected in search text` });
      }
    }
  }

  return {
    hasViolations: violations.length > 0,
    violations,
    isUnknownFallback: true,
    hasActive,
  };
}

function detectAvoidedAdditives(product) {
  const result = [];
  const seen = new Set();
  const ing = (product.ingredientsText || '').toLowerCase();
  const adds = product.additives || [];

  for (const spec of COMMONLY_AVOIDED_ADDITIVES) {
    let matched = false;
    for (const add of adds) {
      const clean = (add.id || '').toLowerCase();
      const name = (add.name || '').toLowerCase();
      for (const k of spec.keys) {
        if (clean.includes(k) || name.includes(k)) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched && ing) {
      for (const k of spec.keys) {
        if (matchKeywordInText(ing, k)) {
          matched = true;
          break;
        }
      }
    }

    if (matched && !seen.has(spec.id)) {
      seen.add(spec.id);
      result.push(spec);
    }
  }
  return result;
}

function renderAllergenBannerHtml(checkResult) {
  if (checkResult.hasViolations) {
    return `
      <div id="allergen-violation-banner" class="allergen-alert-banner">
        <div class="allergen-alert-header">
          <div class="allergen-alert-title-wrap">
            <div class="allergen-alert-icon">⚠️</div>
            <div>
              <span class="allergen-alert-tag">Warning</span>
              <h3 class="allergen-alert-heading">Allergen & Dietary Warning</h3>
            </div>
          </div>
          <button onclick="openDietarySettingsModal()" class="btn-scan-another-sm" style="background:#7f1d1d;border-color:#b91c1c;font-size:0.7rem;padding:0.25rem 0.5rem;">
            Edit Profile
          </button>
        </div>

        <div class="allergen-violations-list">
          ${checkResult.violations.map((v) => `
            <div class="allergen-violation-item">
              <span class="violation-badge">${v.name}</span>
              <span class="violation-trigger">${v.trigger}</span>
            </div>
          `).join('')}
        </div>
        <p style="font-size:0.65rem;color:#fca5a5;margin-top:0.25rem;">
          Cross-check triggered by your personal dietary profile. Always inspect the physical package label.
        </p>
      </div>
    `;
  }

  if (checkResult.isUnknownFallback && checkResult.hasActive) {
    return `
      <div id="allergen-unverified-notice" class="allergen-unverified-notice">
        <div class="allergen-notice-icon">🛡️</div>
        <div style="flex:1;">
          <span style="background:rgba(245,158,11,0.2);color:#f59e0b;font-size:0.65rem;font-weight:700;padding:0.1rem 0.4rem;border-radius:9999px;text-transform:uppercase;">
            Notice
          </span>
          <p style="font-weight:700;font-size:0.8rem;color:#fef3c7;margin-top:0.2rem;">
            Could not verify allergens — ingredient data not available for this product
          </p>
          <p style="font-size:0.7rem;color:#d4d4d8;margin-top:0.2rem;line-height:1.4;">
            Because full packaging ingredient disclosures are not verified for this web-sourced item, safety cannot be guaranteed. Do not mistake the absence of a warning for an all-clear.
          </p>
        </div>
      </div>
    `;
  }

  return '';
}

function renderNotedAdditivesHtml(noted) {
  if (!noted || noted.length === 0) return '';
  return `
    <div class="noted-additives-card">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#38bdf8;">
          Noted Additives (${noted.length})
        </span>
        <span style="font-size:0.65rem;color:var(--text-muted);font-family:var(--font-mono);">Factual Reference</span>
      </div>
      <p style="font-size:0.7rem;color:var(--text-secondary);">
        Commonly avoided or noted food additives detected in this product:
      </p>
      <div style="display:flex;flex-direction:column;gap:0.4rem;">
        ${noted.map((item) => `
          <div class="noted-additive-item">
            <span class="additive-badge">${item.id}</span>
            <div style="flex:1;">
              <span class="additive-name">${item.name}</span>
              <p class="additive-note">${item.note}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Global modal management for settings UI
function openDietarySettingsModal() {
  const profile = getDietaryProfile();
  let modalEl = document.getElementById('dietary-settings-overlay-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'dietary-settings-overlay-modal';
    modalEl.className = 'dietary-modal-overlay';
    document.body.appendChild(modalEl);
  }

  const allergenKeys = Object.keys(ALLERGEN_DICTIONARY);
  const dietaryFlags = [
    { key: 'vegan', label: 'Vegan', desc: 'Flags meats, dairy, eggs, honey, and animal by-products' },
    { key: 'vegetarian', label: 'Vegetarian', desc: 'Flags meats, seafood, gelatin, and animal rennet' },
    { key: 'halal', label: 'Halal', desc: 'Flags pork, lard, alcohol, and prohibited animal ingredients' },
    { key: 'kosher', label: 'Kosher', desc: 'Flags pork, shellfish, and non-kosher items' },
    { key: 'lowSodium', label: 'Low-Sodium Diet', desc: 'Warns when salt exceeds 1.2g per 100g' },
    { key: 'diabeticFriendly', label: 'Diabetic-Friendly', desc: 'Warns when sugars exceed 15g/100g or contains HFCS' },
  ];

  modalEl.innerHTML = `
    <div class="dietary-modal" onclick="event.stopPropagation()">
      <div class="dietary-modal-header">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:1.2rem;">🛡️</span>
          <div>
            <h3 style="font-size:0.95rem;font-weight:700;color:#ffffff;">Personal Dietary Profile</h3>
            <p style="font-size:0.7rem;color:#a1a1aa;">Auto cross-checks every scanned item</p>
          </div>
        </div>
        <button onclick="closeDietarySettingsModal()" style="background:none;border:none;color:#a1a1aa;font-size:1.2rem;cursor:pointer;">✕</button>
      </div>

      <div class="dietary-modal-body">
        <div>
          <h4 style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#ef4444;margin-bottom:0.5rem;">
            Common Allergens (${allergenKeys.length})
          </h4>
          <div class="dietary-checkbox-grid">
            ${allergenKeys.map((k) => {
              const active = profile.allergens[k];
              return `
                <label class="dietary-check-item ${active ? 'active' : ''}">
                  <input type="checkbox" id="check-allergen-${k}" ${active ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)" style="accent-color:#ef4444;">
                  <span>${ALLERGEN_DICTIONARY[k].name}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <h4 style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#f59e0b;margin-bottom:0.25rem;">
            Other Allergens & Ingredients to Avoid
          </h4>
          <p style="font-size:0.65rem;color:#a1a1aa;margin-bottom:0.4rem;">
            Enter custom ingredients separated by commas (e.g. mustard, sulfites, kiwi, palm oil).
          </p>
          <textarea id="dietary-custom-input" class="dietary-textarea" rows="2" placeholder="e.g. mustard, sulfites, kiwi, palm oil">${profile.customAllergens || ''}</textarea>
        </div>

        <div>
          <h4 style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#10b981;margin-bottom:0.5rem;">
            Dietary & Health Flags
          </h4>
          <div style="display:flex;flex-direction:column;gap:0.4rem;">
            ${dietaryFlags.map((flag) => {
              const active = profile.dietaryFlags[flag.key];
              return `
                <label class="dietary-check-item diet-flag ${active ? 'active' : ''}" style="justify-content:flex-start;">
                  <input type="checkbox" id="check-flag-${flag.key}" ${active ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)" style="accent-color:#10b981;margin-top:0.2rem;">
                  <div style="flex:1;">
                    <span style="font-weight:600;display:block;">${flag.label}</span>
                    <span style="font-size:0.65rem;color:#a1a1aa;display:block;">${flag.desc}</span>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="dietary-modal-footer">
        <button onclick="resetDietaryProfileModal()" class="btn-scan-another-sm" style="background:#27272a;border-color:#3f3f46;color:#d4d4d8;">
          Reset All
        </button>
        <div style="display:flex;gap:0.5rem;">
          <button onclick="closeDietarySettingsModal()" class="btn-scan-another-sm" style="background:transparent;border:none;color:#a1a1aa;">
            Cancel
          </button>
          <button onclick="saveDietaryProfileFromModal()" class="btn-primary" style="width:auto;padding:0.5rem 1.25rem;background:#10b981;">
            Save Profile
          </button>
        </div>
      </div>
    </div>
  `;

  modalEl.style.display = 'flex';
}

function closeDietarySettingsModal() {
  const modalEl = document.getElementById('dietary-settings-overlay-modal');
  if (modalEl) modalEl.style.display = 'none';
}

function resetDietaryProfileModal() {
  const allergenKeys = Object.keys(ALLERGEN_DICTIONARY);
  allergenKeys.forEach((k) => {
    const el = document.getElementById(`check-allergen-${k}`);
    if (el) {
      el.checked = false;
      el.parentElement.classList.remove('active');
    }
  });
  const customEl = document.getElementById('dietary-custom-input');
  if (customEl) customEl.value = '';
  ['vegan', 'vegetarian', 'halal', 'kosher', 'lowSodium', 'diabeticFriendly'].forEach((f) => {
    const el = document.getElementById(`check-flag-${f}`);
    if (el) {
      el.checked = false;
      el.parentElement.classList.remove('active');
    }
  });
}

function saveDietaryProfileFromModal() {
  const allergenKeys = Object.keys(ALLERGEN_DICTIONARY);
  const allergens = {};
  allergenKeys.forEach((k) => {
    const el = document.getElementById(`check-allergen-${k}`);
    allergens[k] = el ? el.checked : false;
  });

  const customEl = document.getElementById('dietary-custom-input');
  const customAllergens = customEl ? customEl.value.trim() : '';

  const dietaryFlags = {};
  ['vegan', 'vegetarian', 'halal', 'kosher', 'lowSodium', 'diabeticFriendly'].forEach((f) => {
    const el = document.getElementById(`check-flag-${f}`);
    dietaryFlags[f] = el ? el.checked : false;
  });

  const profile = {
    allergens,
    customAllergens,
    dietaryFlags,
    isConfigured: true,
  };

  saveDietaryProfile(profile);
  closeDietarySettingsModal();
  console.log('Saved user dietary profile:', profile);
}

// ============================================================================
// Scan History & Favorites Persistence Engine (Capped at 200)
// ============================================================================

const SCAN_HISTORY_KEY = 'barcode_scanner_history_v1';
const MAX_HISTORY_ENTRIES = 200;

let currentHistoryFilter = 'all'; // 'all' | 'favorites'
let currentHistorySearch = '';

function getScanHistory() {
  try {
    const raw = localStorage.getItem(SCAN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse scan history from localStorage:', err);
    return [];
  }
}

function saveScanHistory(list) {
  try {
    const capped = list.slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(capped));
    return capped;
  } catch (err) {
    console.warn('Failed to write scan history to localStorage:', err);
    return list;
  }
}

function recordScanInHistory({ barcode, source, productName, brand, imageUrl, cachedData }) {
  try {
    const cleanCode = String(barcode).trim();
    if (!cleanCode) return [];
    const current = getScanHistory();

    const existingIndex = current.findIndex((item) => item.barcode === cleanCode);
    const wasFavorite = existingIndex >= 0 ? Boolean(current[existingIndex].isFavorite) : false;

    const newEntry = {
      id: `${cleanCode}_${Date.now()}`,
      barcode: cleanCode,
      timestamp: Date.now(),
      productName: productName || 'Unknown Product',
      brand: brand || undefined,
      imageUrl: imageUrl || undefined,
      source: source || 'openfoodfacts', // 'openfoodfacts' | 'gemini_fallback' | 'not_found'
      isFavorite: wasFavorite,
      cachedData: cachedData || null,
    };

    const remaining = current.filter((item) => item.barcode !== cleanCode);
    const updated = [newEntry, ...remaining].slice(0, MAX_HISTORY_ENTRIES);
    saveScanHistory(updated);
    return updated;
  } catch (err) {
    console.warn('Error recording scan history entry:', err);
    return [];
  }
}

function toggleHistoryFavorite(barcode) {
  const current = getScanHistory();
  const updated = current.map((item) => {
    if (item.barcode === barcode) {
      return { ...item, isFavorite: !item.isFavorite };
    }
    return item;
  });
  saveScanHistory(updated);
  return updated;
}

function deleteHistoryEntry(barcode) {
  const current = getScanHistory();
  const updated = current.filter((item) => item.barcode !== barcode);
  saveScanHistory(updated);
  return updated;
}

function clearAllHistory() {
  localStorage.removeItem(SCAN_HISTORY_KEY);
  return [];
}

function isBarcodeFavorited(barcode) {
  const current = getScanHistory();
  return current.some((item) => item.barcode === barcode && item.isFavorite);
}

function formatRelativeTime(timestamp) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 min ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function filterHistory(filterTab = currentHistoryFilter, searchQuery = currentHistorySearch) {
  const all = getScanHistory();
  return all.filter((item) => {
    if (filterTab === 'favorites' && !item.isFavorite) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (item.productName || '').toLowerCase().includes(q);
      const brandMatch = (item.brand || '').toLowerCase().includes(q);
      const codeMatch = (item.barcode || '').includes(q);
      if (!nameMatch && !brandMatch && !codeMatch) return false;
    }
    return true;
  });
}

function openHistoryModal(filterTab = 'all') {
  currentHistoryFilter = filterTab;
  currentHistorySearch = '';

  let modalEl = document.getElementById('history-view-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'history-view-modal';
    document.body.appendChild(modalEl);
  }

  const allCount = getScanHistory().length;
  const favCount = getScanHistory().filter((i) => i.isFavorite).length;

  modalEl.innerHTML = `
    <div class="history-modal-overlay" onclick="if(event.target === this) closeHistoryModal()">
      <div class="history-modal-container">
        <!-- Header -->
        <div class="history-modal-header">
          <div class="history-header-left">
            <div class="history-header-icon">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 class="history-title">
                Scan History
                <span id="history-total-badge" class="history-count-badge">${allCount} / ${MAX_HISTORY_ENTRIES}</span>
              </h2>
            </div>
          </div>
          <button onclick="closeHistoryModal()" class="btn-close-modal" title="Close history" aria-label="Close history modal">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Controls: Search & Tabs & Clear All -->
        <div class="history-controls">
          <div class="history-search-box">
            <svg class="history-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="history-search-input"
              type="text"
              class="history-search-input"
              placeholder="Search products by name, brand, or barcode..."
              value=""
              oninput="handleHistorySearchInput(this.value)"
            />
            <button
              id="history-search-clear-btn"
              onclick="clearHistorySearchInput()"
              class="history-search-clear"
              style="display:none;"
              title="Clear search"
            >✕</button>
          </div>

          <div class="history-tabs-row">
            <div class="history-tabs">
              <button
                id="btn-history-tab-all"
                onclick="setHistoryFilterTab('all')"
                class="history-tab-btn ${currentHistoryFilter === 'all' ? 'active' : ''}"
              >
                All Scans (<span id="history-tab-all-count">${allCount}</span>)
              </button>
              <button
                id="btn-history-tab-fav"
                onclick="setHistoryFilterTab('favorites')"
                class="history-tab-btn tab-fav ${currentHistoryFilter === 'favorites' ? 'active' : ''}"
              >
                ★ Favorites (<span id="history-tab-fav-count">${favCount}</span>)
              </button>
            </div>

            <button
              onclick="confirmClearAllHistory()"
              class="history-clear-all-btn"
              title="Clear all saved history"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear All</span>
            </button>
          </div>
        </div>

        <!-- History Item List -->
        <div id="history-items-container" class="history-items-list">
          ${renderHistoryListHtml(currentHistoryFilter, currentHistorySearch)}
        </div>

        <!-- Footer -->
        <div class="history-footer">
          Capped at ${MAX_HISTORY_ENTRIES} entries • Tapping a scan reopens the result instantly without re-fetching
        </div>
      </div>
    </div>
  `;

  modalEl.style.display = 'block';
}

function closeHistoryModal() {
  const modalEl = document.getElementById('history-view-modal');
  if (modalEl) modalEl.style.display = 'none';
}

function setHistoryFilterTab(tab) {
  currentHistoryFilter = tab;
  const allBtn = document.getElementById('btn-history-tab-all');
  const favBtn = document.getElementById('btn-history-tab-fav');
  if (allBtn && favBtn) {
    allBtn.classList.toggle('active', tab === 'all');
    favBtn.classList.toggle('active', tab === 'favorites');
  }
  refreshHistoryListHtml();
}

function handleHistorySearchInput(val) {
  currentHistorySearch = val.trim();
  const clearBtn = document.getElementById('history-search-clear-btn');
  if (clearBtn) {
    clearBtn.style.display = currentHistorySearch ? 'block' : 'none';
  }
  refreshHistoryListHtml();
}

function clearHistorySearchInput() {
  const input = document.getElementById('history-search-input');
  if (input) input.value = '';
  handleHistorySearchInput('');
}

function refreshHistoryListHtml() {
  const container = document.getElementById('history-items-container');
  if (container) {
    container.innerHTML = renderHistoryListHtml(currentHistoryFilter, currentHistorySearch);
  }
  // Update badges
  const allCount = getScanHistory().length;
  const favCount = getScanHistory().filter((i) => i.isFavorite).length;
  const allCountEl = document.getElementById('history-tab-all-count');
  const favCountEl = document.getElementById('history-tab-fav-count');
  const totalBadgeEl = document.getElementById('history-total-badge');
  if (allCountEl) allCountEl.textContent = allCount;
  if (favCountEl) favCountEl.textContent = favCount;
  if (totalBadgeEl) totalBadgeEl.textContent = `${allCount} / ${MAX_HISTORY_ENTRIES}`;
}

function renderHistoryListHtml(filterTab, searchQuery) {
  const items = filterHistory(filterTab, searchQuery);

  if (items.length === 0) {
    if (searchQuery) {
      return `
        <div style="padding:2.5rem 1rem;text-align:center;color:#71717a;">
          <svg style="width:2.5rem;height:2.5rem;margin:0 auto 0.75rem;color:#52525b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p style="font-weight:600;color:#d4d4d8;font-size:0.85rem;">No products found</p>
          <p style="font-size:0.75rem;margin-top:0.25rem;">No scans match "${searchQuery}".</p>
        </div>
      `;
    }
    if (filterTab === 'favorites') {
      return `
        <div style="padding:2.5rem 1rem;text-align:center;color:#71717a;">
          <svg style="width:2.5rem;height:2.5rem;margin:0 auto 0.75rem;color:#f59e0b;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p style="font-weight:600;color:#d4d4d8;font-size:0.85rem;">No favorites yet</p>
          <p style="font-size:0.75rem;margin-top:0.25rem;">Tap the star icon on any scan result to add it to your favorites.</p>
        </div>
      `;
    }
    return `
      <div style="padding:2.5rem 1rem;text-align:center;color:#71717a;">
        <svg style="width:2.5rem;height:2.5rem;margin:0 auto 0.75rem;color:#52525b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p style="font-weight:600;color:#d4d4d8;font-size:0.85rem;">No scan history</p>
        <p style="font-size:0.75rem;margin-top:0.25rem;">Scan barcodes with your camera or enter them manually to track them here.</p>
      </div>
    `;
  }

  return items.map((item) => {
    const sourceClass = `source-${item.source}`;
    const sourceLabel =
      item.source === 'openfoodfacts'
        ? 'Open Food Facts'
        : item.source === 'gemini_fallback'
        ? 'Web Search'
        : 'Not Found';

    const relativeTime = formatRelativeTime(item.timestamp);

    return `
      <div
        class="history-item-card"
        onclick="reopenFromHistory('${item.barcode}')"
        title="Tap to reopen full result without re-fetching"
      >
        <div class="history-item-thumb">
          ${
            item.imageUrl
              ? `<img src="${item.imageUrl}" alt="${item.productName}" onerror="this.style.display='none'" />`
              : `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`
          }
        </div>

        <div class="history-item-details">
          <div class="history-item-meta">
            <span class="history-source-badge ${sourceClass}">${sourceLabel}</span>
            <span class="history-relative-time">${relativeTime}</span>
          </div>
          <h4 class="history-item-name">${item.productName}</h4>
          <div class="history-item-sub">
            <span class="barcode">${item.barcode}</span>
            ${item.brand ? `<span>• ${item.brand}</span>` : ''}
          </div>
        </div>

        <div class="history-item-actions" onclick="event.stopPropagation()">
          <button
            onclick="toggleFavoriteFromHistory('${item.barcode}', event)"
            class="history-star-btn ${item.isFavorite ? 'active' : ''}"
            title="${item.isFavorite ? 'Remove Favorite' : 'Save as Favorite'}"
          >
            <svg class="w-4 h-4" fill="${item.isFavorite ? '#fbbf24' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            onclick="deleteHistoryItemFromModal('${item.barcode}', event)"
            class="history-delete-btn"
            title="Delete this scan from history"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleFavoriteFromHistory(barcode, event) {
  if (event) event.stopPropagation();
  toggleHistoryFavorite(barcode);
  refreshHistoryListHtml();
}

function deleteHistoryItemFromModal(barcode, event) {
  if (event) event.stopPropagation();
  deleteHistoryEntry(barcode);
  refreshHistoryListHtml();
  updateRecentScansOnScreen();
}

function confirmClearAllHistory() {
  let confirmEl = document.getElementById('history-clear-confirm-dialog');
  if (!confirmEl) {
    confirmEl = document.createElement('div');
    confirmEl.id = 'history-clear-confirm-dialog';
    document.body.appendChild(confirmEl);
  }

  confirmEl.innerHTML = `
    <div class="confirm-dialog-overlay" onclick="if(event.target === this) closeConfirmClearDialog()">
      <div class="confirm-dialog-box">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="width:2.25rem;height:2.25rem;border-radius:0.65rem;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 style="font-size:0.95rem;font-weight:700;color:#fff;">Clear All History?</h3>
            <p style="font-size:0.75rem;color:#a1a1aa;margin-top:0.2rem;">This will permanently remove all ${getScanHistory().length} saved scans and favorites. This action cannot be undone.</p>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;">
          <button onclick="closeConfirmClearDialog()" class="btn-secondary" style="width:auto;padding:0.5rem 1rem;font-size:0.8rem;">
            Cancel
          </button>
          <button onclick="executeClearAllHistory()" class="btn-primary" style="width:auto;padding:0.5rem 1rem;font-size:0.8rem;background:#dc2626;border-color:#ef4444;">
            Yes, Clear All
          </button>
        </div>
      </div>
    </div>
  `;
  confirmEl.style.display = 'block';
}

function closeConfirmClearDialog() {
  const confirmEl = document.getElementById('history-clear-confirm-dialog');
  if (confirmEl) confirmEl.style.display = 'none';
}

function executeClearAllHistory() {
  clearAllHistory();
  closeConfirmClearDialog();
  refreshHistoryListHtml();
  updateRecentScansOnScreen();
}

/**
 * Reopen scan result immediately from memory/cache without re-fetching!
 */
function reopenFromHistory(barcode) {
  closeHistoryModal();
  const history = getScanHistory();
  const item = history.find((h) => h.barcode === barcode);

  if (!item) {
    handleBarcodeDetected(barcode, 'manual');
    return;
  }

  if (item.source === 'openfoodfacts' && item.cachedData) {
    renderProductDetailView(item.cachedData);
    return;
  }

  if (item.source === 'gemini_fallback' && item.cachedData) {
    renderGeminiProductView(item.cachedData);
    return;
  }

  if (item.source === 'not_found') {
    renderGeminiNotFoundView(item.barcode);
    return;
  }

  // Fallback if no cached payload exists
  handleBarcodeDetected(barcode, 'manual');
}

/**
 * Toggle favorite from current active product result view
 */
function toggleFavoriteFromCurrentProduct(barcode) {
  toggleHistoryFavorite(barcode);
  const isFav = isBarcodeFavorited(barcode);
  const btn = document.getElementById(`btn-fav-${barcode}`);
  if (btn) {
    btn.classList.toggle('active', isFav);
    btn.title = isFav ? 'Remove Favorite' : 'Save to Favorites';
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', isFav ? '#fbbf24' : 'none');
    const span = btn.querySelector('span');
    if (span) span.textContent = isFav ? 'Favorited' : 'Favorite';
  }
}

/**
 * Renders the recent scans preview box for the home screen
 */
function renderRecentScansPreviewHtml() {
  const history = getScanHistory();
  if (history.length === 0) return '';

  const recent = history.slice(0, 4);

  return `
    <div id="recent-scans-home-card" class="recent-scans-card">
      <div class="recent-scans-header">
        <div class="recent-scans-title">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Recent Scans (${history.length})</span>
        </div>
        <button onclick="openHistoryModal('all')" class="btn-view-all-history-sm">
          <span>View All & Search</span>
          <span style="font-size:0.65rem;background:rgba(16,185,129,0.2);padding:0.1rem 0.4rem;border-radius:9999px;">${history.length}</span>
        </button>
      </div>

      <div style="display:flex;flex-direction:column;gap:0.5rem;">
        ${recent.map((item) => `
          <div
            onclick="reopenFromHistory('${item.barcode}')"
            class="history-item-card"
            style="padding:0.5rem 0.65rem;"
            title="Tap to reopen full result without re-fetching"
          >
            <div class="history-item-thumb" style="width:2.25rem;height:2.25rem;">
              ${
                item.imageUrl
                  ? `<img src="${item.imageUrl}" alt="${item.productName}" onerror="this.style.display='none'" />`
                  : `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`
              }
            </div>

            <div class="history-item-details">
              <h4 class="history-item-name" style="font-size:0.78rem;">${item.productName}</h4>
              <div class="history-item-sub">
                <span class="barcode">${item.barcode}</span>
                <span>• ${formatRelativeTime(item.timestamp)}</span>
              </div>
            </div>

            <div class="history-item-actions" onclick="event.stopPropagation()">
              <button
                onclick="toggleFavoriteFromHomePreview('${item.barcode}', event)"
                class="history-star-btn ${item.isFavorite ? 'active' : ''}"
                title="${item.isFavorite ? 'Remove Favorite' : 'Save as Favorite'}"
              >
                <svg class="w-3.5 h-3.5" fill="${item.isFavorite ? '#fbbf24' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function toggleFavoriteFromHomePreview(barcode, event) {
  if (event) event.stopPropagation();
  toggleHistoryFavorite(barcode);
  updateRecentScansOnScreen();
}

function updateRecentScansOnScreen() {
  const container = document.getElementById('recent-scans-home-card');
  if (container) {
    const parent = container.parentElement;
    if (parent) {
      container.outerHTML = renderRecentScansPreviewHtml();
    }
  }
}


// Audio & Haptic feedback
function playDetectionBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.warn('Audio feedback error:', err);
  }
}

function triggerDetectionHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([80, 40, 80]);
    } catch {
      // ignore
    }
  }
}

/**
 * Detect support for native BarcodeDetector API
 */
async function checkNativeBarcodeSupport() {
  if (!('BarcodeDetector' in window)) {
    return { supported: false, formats: [] };
  }
  try {
    if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const matched = TARGET_FORMATS.filter((fmt) => supported.includes(fmt));
      return { supported: matched.length > 0, formats: matched };
    }
    return { supported: true, formats: TARGET_FORMATS };
  } catch (err) {
    console.warn('BarcodeDetector format check error:', err);
    return { supported: false, formats: [] };
  }
}

/**
 * Renders in-flight Gemini Web Search Loading State
 */
function renderGeminiSearching(code) {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  mainView.innerHTML = `
    <div id="gemini-searching-view" class="product-card skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton-spinner" style="border-top-color: #38bdf8;"></div>
        <div>
          <p class="skeleton-loading-text" style="color: #38bdf8;">Searching web with Gemini AI...</p>
          <p class="skeleton-code font-mono">Barcode: ${code} • Querying Google Search Grounding</p>
        </div>
      </div>
      <div class="skeleton-top-row">
        <div class="skeleton-box skeleton-img" style="display:flex;align-items:center;justify-content:center;">
          <svg class="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <div class="skeleton-text-stack">
          <div class="skeleton-line line-lg"></div>
          <div class="skeleton-line line-md"></div>
          <div class="skeleton-line line-sm"></div>
        </div>
      </div>
      <div class="skeleton-badges-grid">
        <div class="skeleton-badge-box"></div>
        <div class="skeleton-badge-box"></div>
      </div>
      <div class="skeleton-table">
        <div class="skeleton-line line-sm mb-2"></div>
        <div class="skeleton-table-row"></div>
        <div class="skeleton-table-row"></div>
      </div>
    </div>
  `;
}

/**
 * Renders the product found via Gemini Web Search Grounding.
 * Matches the Open Food Facts detail view style, but includes:
 * - Distinct "Found via web search — not in our verified product database" badge in a different color.
 * - Clickable grounding sources & citations.
 */
function renderGeminiProductView(data) {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  const brand = data.brand || 'Unspecified Brand';
  const productName = data.productName || 'Web Product Search Result';
  const category = data.category || '';
  const priceRange = data.priceRange || 'Not reported';
  const description = data.description || data.rawText || 'Product found via Google Search.';
  const sources = data.sources || [];

  const profile = getDietaryProfile();
  const checkResult = checkGeminiAgainstUserProfile(data, profile);
  const allergenBannerHtml = renderAllergenBannerHtml(checkResult);

  mainView.innerHTML = `
    <div id="product-detail-card" class="product-card gemini-card">
      <!-- Allergen & Dietary Banner: Prominently at the Very Top -->
      ${allergenBannerHtml}

      <!-- Distinct Source Badge required by prompt -->
      <div class="badge-web-search">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span>Found via web search — not in our verified product database</span>
      </div>

      <div class="product-top-bar" style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
        <span class="barcode-pill font-mono">${data.barcode}</span>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <button id="btn-fav-${data.barcode}" onclick="toggleFavoriteFromCurrentProduct('${data.barcode}')" class="btn-favorite-top ${isBarcodeFavorited(data.barcode) ? 'active' : ''}" title="${isBarcodeFavorited(data.barcode) ? 'Remove Favorite' : 'Save to Favorites'}">
            <svg class="w-3.5 h-3.5" fill="${isBarcodeFavorited(data.barcode) ? '#fbbf24' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>${isBarcodeFavorited(data.barcode) ? 'Favorited' : 'Favorite'}</span>
          </button>
          <button onclick="startScannerFlow()" class="btn-scan-another-sm" style="background:#0284c7;border-color:#38bdf8;">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Scan Another
          </button>
        </div>
      </div>

      <div class="product-hero">
        <div class="product-img-frame no-img" style="border-color: rgba(56, 189, 248, 0.3);">
          <svg class="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span style="color:#38bdf8;font-size:0.65rem;margin-top:0.25rem;">Web Product</span>
        </div>
        <div class="product-meta">
          <span class="product-brand" style="color:#38bdf8;">${brand}</span>
          <h2 class="product-name">${productName}</h2>
          ${category ? `<span class="product-qty" style="color:#94a3b8;">${category}</span>` : ''}
        </div>
      </div>

      <!-- Key metadata -->
      <div class="gemini-meta-grid">
        <div class="gemini-meta-box">
          <span class="gemini-meta-label">Brand</span>
          <span class="gemini-meta-val">${brand}</span>
        </div>
        <div class="gemini-meta-box">
          <span class="gemini-meta-label">Typical Price Range</span>
          <span class="gemini-meta-val" style="color:#34d399;">${priceRange}</span>
        </div>
      </div>

      <!-- Product Description -->
      <div class="detail-section">
        <h3 class="section-title" style="color:#38bdf8;">Product Description</h3>
        <p class="ingredients-text" style="color:var(--text-primary);font-size:0.85rem;line-height:1.6;">
          ${description}
        </p>
      </div>

      <!-- Grounding Sources & Citations -->
      <div class="citations-section">
        <div class="citations-header">
          <span class="citations-title">Grounding Sources & Web Citations (${sources.length})</span>
          <span class="font-mono text-xs" style="color:#71717a;">Google Search</span>
        </div>
        ${sources.length > 0 ? `
          <div class="citations-list">
            ${sources.map((s) => `
              <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="citation-link">
                <span class="citation-title">${s.title || s.url}</span>
                <svg class="w-3.5 h-3.5 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            `).join('')}
          </div>
        ` : `
          <p class="empty-state-text">Results verified with Google Search grounding.</p>
        `}
      </div>

      <!-- Actions -->
      <div class="actions-stack">
        <button onclick="startScannerFlow()" class="btn-primary w-full" style="background:#0284c7;">
          Scan Another Product
        </button>
      </div>
    </div>
  `;
}

/**
 * Clear final state when neither Open Food Facts nor Gemini web search finds verified information.
 * Shows note: "Some store-specific or regional barcodes aren't in any public database."
 * Keeps manual entry option available.
 */
function renderGeminiNotFoundView(code) {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  mainView.innerHTML = `
    <div id="gemini-not-found-view" class="status-card no-info-card">
      <div class="status-accent-bar bg-amber"></div>
      <div class="status-icon-box text-amber">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="status-title">No information found for this barcode</h2>
      <p class="status-subtitle">
        Neither the Open Food Facts food database nor Google web search returned verified product information for barcode <span class="font-mono text-amber">${code}</span>.
      </p>

      <div class="note-box">
        <p class="note-box-title">Note</p>
        <p>Some store-specific or regional barcodes aren't in any public database.</p>
      </div>

      <div class="code-banner">
        <span class="label">Decoded Barcode</span>
        <span class="value font-mono">${code}</span>
      </div>

      <!-- Manual entry option remains available -->
      <div class="manual-card" style="margin-top: 1rem; text-align: left;">
        <form onsubmit="handleManualFormSubmit(event)">
          <label for="manual-barcode-input-notfound" class="result-label" style="font-size:0.75rem;margin-bottom:0.4rem;display:block;">
            Enter Another Barcode Manually
          </label>
          <div style="display: flex; gap: 0.5rem;">
            <input
              id="manual-barcode-input"
              type="text"
              class="input-field"
              placeholder="e.g. 7622210449283"
              required
            />
            <button type="submit" class="btn-primary" style="width: auto; padding: 0.75rem 1rem;">
              Lookup
            </button>
          </div>
        </form>
      </div>

      <div class="actions-stack" style="margin-top: 1rem;">
        <button onclick="startScannerFlow()" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Scan Another Barcode
        </button>
      </div>
    </div>
  `;
}

/**
 * Handle product not found in Open Food Facts database.
 * Calls Gemini API with Google Search Grounding tool enabled to lookup non-food items
 * (electronics, household goods, cosmetics, etc.) or unknown products.
 */
async function handleProductNotFound(code) {
  const cleanCode = String(code).trim();
  console.log(`[Open Food Facts] Barcode ${cleanCode} not in food database. Calling Gemini Search Grounding fallback...`);

  // Show searching status
  renderGeminiSearching(cleanCode);

  // Exact framing specified by user instructions to prevent invented data
  const exactPrompt = `Look up the product associated with barcode ${cleanCode} using web search.
Report only information you find in search results — brand, product
name, category, typical price range, and a two-sentence description.
If search returns nothing reliable for this exact barcode, say clearly
that no verified product information was found. Do not guess or infer
a product from the barcode number pattern alone.`;

  try {
    const response = await fetch('/api/barcode/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ barcode: cleanCode, prompt: exactPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Gemini lookup endpoint returned ${response.status}`);
    }

    const data = await response.json();

    if (data.found && (data.productName || data.brand || data.rawText)) {
      recordScanInHistory({
        barcode: cleanCode,
        source: 'gemini_fallback',
        productName: data.productName || 'Web Product Search Result',
        brand: data.brand,
        cachedData: data,
      });
      renderGeminiProductView(data);
    } else {
      recordScanInHistory({
        barcode: cleanCode,
        source: 'not_found',
        productName: 'Product Not Found',
        cachedData: null,
      });
      renderGeminiNotFoundView(cleanCode);
    }
  } catch (err) {
    console.warn('Gemini search grounding lookup error:', err);
    recordScanInHistory({
      barcode: cleanCode,
      source: 'not_found',
      productName: 'Product Not Found',
      cachedData: null,
    });
    renderGeminiNotFoundView(cleanCode);
  }
}

/**
 * Renders Network Request Error state (distinguishing network failure from product not found)
 */
function renderNetworkError(code, errorMessage) {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  mainView.innerHTML = `
    <div id="network-error-view" class="status-card error-card">
      <div class="status-accent-bar bg-rose"></div>
      <div class="status-icon-box text-rose">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-6.364c0-2.43.97-4.63 2.545-6.242M3 3l18 18" />
        </svg>
      </div>
      <h2 class="status-title">Network Request Failed</h2>
      <p class="status-subtitle">
        Could not connect to Open Food Facts for barcode <span class="font-mono text-zinc-300">${code}</span>.
      </p>
      <div class="error-details-box">
        ${errorMessage || 'Connection failed or timed out. Please check your network connection.'}
      </div>
      <div class="actions-stack">
        <button onclick="handleBarcodeDetected('${code}')" class="btn-primary">
          Retry Lookup
        </button>
        <button onclick="startScannerFlow()" class="btn-secondary">
          Scan Another Barcode
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders loading skeleton while fetch is in flight
 */
function renderLoadingSkeleton(code) {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  mainView.innerHTML = `
    <div class="product-card skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton-spinner"></div>
        <div>
          <p class="skeleton-loading-text">Fetching Open Food Facts data...</p>
          <p class="skeleton-code font-mono">Barcode: ${code}</p>
        </div>
      </div>
      <div class="skeleton-top-row">
        <div class="skeleton-box skeleton-img"></div>
        <div class="skeleton-text-stack">
          <div class="skeleton-line line-lg"></div>
          <div class="skeleton-line line-md"></div>
          <div class="skeleton-line line-sm"></div>
        </div>
      </div>
      <div class="skeleton-badges-grid">
        <div class="skeleton-badge-box"></div>
        <div class="skeleton-badge-box"></div>
      </div>
      <div class="skeleton-table">
        <div class="skeleton-line line-sm mb-2"></div>
        <div class="skeleton-table-row"></div>
        <div class="skeleton-table-row"></div>
        <div class="skeleton-table-row"></div>
      </div>
    </div>
  `;
}

/**
 * Score metadata helpers
 */
function getNutriScoreBadge(grade) {
  if (!grade) return null;
  const g = grade.toUpperCase();
  const map = {
    A: { class: 'score-a', exp: 'Very good nutritional quality — low in sugars, saturated fats, and salt.' },
    B: { class: 'score-b', exp: 'Good nutritional quality — healthy everyday choice with balanced nutrients.' },
    C: { class: 'score-c', exp: 'Moderate nutritional quality — balanced nutrients in moderation.' },
    D: { class: 'score-d', exp: 'Poor nutritional quality — higher in saturated fat, salt, or sugar.' },
    E: { class: 'score-e', exp: 'Unfavorable nutritional quality — high in salt, sugar, or unhealthy fats.' },
  };
  return map[g] ? { grade: g, ...map[g] } : null;
}

function getNovaGroupBadge(group) {
  if (group === undefined || group === null) return null;
  const num = Number(group);
  const map = {
    1: { class: 'nova-1', exp: 'Unprocessed or minimally processed foods (whole foods, fresh produce).' },
    2: { class: 'nova-2', exp: 'Processed culinary ingredients (oils, butter, sugar, salt).' },
    3: { class: 'nova-3', exp: 'Processed foods (canned goods, simple cheeses, fresh breads).' },
    4: { class: 'nova-4', exp: 'Ultra-processed formulations (industrial ingredients, additives, flavourings).' },
  };
  return map[num] ? { group: num, ...map[num] } : null;
}

function getEcoScoreBadge(grade) {
  if (!grade) return null;
  const g = grade.toUpperCase();
  const map = {
    A: { class: 'score-a', exp: 'Very low environmental impact.' },
    B: { class: 'score-b', exp: 'Low environmental footprint.' },
    C: { class: 'score-c', exp: 'Moderate environmental impact.' },
    D: { class: 'score-d', exp: 'High environmental footprint.' },
    E: { class: 'score-e', exp: 'Very high environmental impact on climate and biodiversity.' },
  };
  return map[g] ? { grade: g, ...map[g] } : null;
}

/**
 * Renders complete Product Detail View
 */
function renderProductDetailView(product) {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  const nutri = getNutriScoreBadge(product.nutriscore_grade || product.nutrition_grades);
  const nova = getNovaGroupBadge(product.nova_group);
  const eco = getEcoScoreBadge(product.ecoscore_grade);

  // Parse allergens
  const rawAllergens = product.allergens_tags || product.allergens_hierarchy || [];
  const allergens = rawAllergens.map((tag) => {
    const clean = tag.replace(/^([a-z]{2}:)?/, '').replace(/[-_]/g, ' ');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  });

  // Parse additives
  const rawAdditives = product.additives_tags || product.additives_original_tags || [];
  const additives = rawAdditives.map((tag) => {
    const clean = tag.replace(/^([a-z]{2}:)?/, '').toUpperCase();
    return clean;
  });

  // Nutriments
  const nutriments = product.nutriments || {};
  const rows = [
    { label: 'Energy', p100: nutriments['energy-kcal_100g'] != null ? `${nutriments['energy-kcal_100g']} kcal` : null, pServ: nutriments['energy-kcal_serving'] != null ? `${nutriments['energy-kcal_serving']} kcal` : null },
    { label: 'Fat', p100: nutriments['fat_100g'] != null ? `${nutriments['fat_100g']} g` : null, pServ: nutriments['fat_serving'] != null ? `${nutriments['fat_serving']} g` : null },
    { label: 'Saturated Fat', p100: nutriments['saturated-fat_100g'] != null ? `${nutriments['saturated-fat_100g']} g` : null, pServ: nutriments['saturated-fat_serving'] != null ? `${nutriments['saturated-fat_serving']} g` : null },
    { label: 'Sugars', p100: nutriments['sugars_100g'] != null ? `${nutriments['sugars_100g']} g` : null, pServ: nutriments['sugars_serving'] != null ? `${nutriments['sugars_serving']} g` : null },
    { label: 'Salt', p100: nutriments['salt_100g'] != null ? `${nutriments['salt_100g']} g` : null, pServ: nutriments['salt_serving'] != null ? `${nutriments['salt_serving']} g` : null },
    { label: 'Protein', p100: nutriments['proteins_100g'] != null ? `${nutriments['proteins_100g']} g` : null, pServ: nutriments['proteins_serving'] != null ? `${nutriments['proteins_serving']} g` : null },
    { label: 'Fiber', p100: nutriments['fiber_100g'] != null ? `${nutriments['fiber_100g']} g` : null, pServ: nutriments['fiber_serving'] != null ? `${nutriments['fiber_serving']} g` : null },
  ];

  const productName = product.product_name || product.product_name_en || 'Unknown Product';
  const brand = product.brands || 'Unknown Brand';
  const quantity = product.quantity || '';
  const imageUrl = product.image_front_url || product.image_url || '';
  const ingredients = product.ingredients_text || product.ingredients_text_en || 'No ingredients list available.';

  // Cross-check against personal dietary/allergen profile
  const profile = getDietaryProfile();
  const normalizedForCheck = {
    ingredientsText: ingredients,
    allergens: allergens,
    nutriments: {
      salt100g: nutriments['salt_100g'] != null ? parseFloat(nutriments['salt_100g']) : null,
      sugars100g: nutriments['sugars_100g'] != null ? parseFloat(nutriments['sugars_100g']) : null,
    },
    additives: additives.map((id) => ({ id, name: id })),
  };
  const checkResult = checkProductAgainstUserProfile(normalizedForCheck, profile);
  const allergenBannerHtml = renderAllergenBannerHtml(checkResult);
  const notedAdditives = detectAvoidedAdditives(normalizedForCheck);
  const notedAdditivesHtml = renderNotedAdditivesHtml(notedAdditives);

  mainView.innerHTML = `
    <div id="product-detail-card" class="product-card">
      <!-- Allergen Alert Banner: Prominently at the Very Top -->
      ${allergenBannerHtml}

      <div class="product-top-bar" style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
        <span class="barcode-pill font-mono">${product.code}</span>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <button id="btn-fav-${product.code}" onclick="toggleFavoriteFromCurrentProduct('${product.code}')" class="btn-favorite-top ${isBarcodeFavorited(product.code) ? 'active' : ''}" title="${isBarcodeFavorited(product.code) ? 'Remove Favorite' : 'Save to Favorites'}">
            <svg class="w-3.5 h-3.5" fill="${isBarcodeFavorited(product.code) ? '#fbbf24' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>${isBarcodeFavorited(product.code) ? 'Favorited' : 'Favorite'}</span>
          </button>
          <button onclick="startScannerFlow()" class="btn-scan-another-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Scan Another
          </button>
        </div>
      </div>

      <div class="product-hero">
        ${imageUrl ? `
          <div class="product-img-frame">
            <img src="${imageUrl}" alt="${productName}" referrerpolicy="no-referrer" />
          </div>
        ` : `
          <div class="product-img-frame no-img">
            <span>No Image</span>
          </div>
        `}
        <div class="product-meta">
          <span class="product-brand">${brand}</span>
          <h2 class="product-name">${productName}</h2>
          ${quantity ? `<span class="product-qty">${quantity}</span>` : ''}
        </div>
      </div>

      <!-- Ratings: Nutri-Score & NOVA -->
      <div class="scores-grid">
        ${nutri ? `
          <div class="score-card">
            <div class="score-badge ${nutri.class}">${nutri.grade}</div>
            <div class="score-info">
              <span class="score-title">Nutri-Score ${nutri.grade}</span>
              <p class="score-desc">${nutri.exp}</p>
            </div>
          </div>
        ` : ''}

        ${nova ? `
          <div class="score-card">
            <div class="score-badge ${nova.class}">${nova.group}</div>
            <div class="score-info">
              <span class="score-title">NOVA Group ${nova.group}</span>
              <p class="score-desc">${nova.exp}</p>
            </div>
          </div>
        ` : ''}

        ${eco ? `
          <div class="score-card full-span">
            <div class="score-badge ${eco.class}">${eco.grade}</div>
            <div class="score-info">
              <span class="score-title">Eco-Score ${eco.grade}</span>
              <p class="score-desc">${eco.exp}</p>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Allergens List -->
      <div class="detail-section">
        <h3 class="section-title text-amber">Allergen Alerts</h3>
        ${allergens.length > 0 ? `
          <div class="chips-container">
            ${allergens.map((a) => `<span class="chip chip-allergen">${a}</span>`).join('')}
          </div>
        ` : `
          <p class="empty-state-text">No allergens tagged by manufacturer.</p>
        `}
      </div>

      <!-- Additives List -->
      <div class="detail-section">
        <h3 class="section-title text-purple">Food Additives (${additives.length})</h3>
        ${additives.length > 0 ? `
          <div class="chips-container">
            ${additives.map((e) => `<span class="chip chip-additive font-mono">${e}</span>`).join('')}
          </div>
        ` : `
          <p class="empty-state-text">No additive E-numbers declared.</p>
        `}
      </div>

      <!-- Noted Additives (Fact-based breakdown of commonly avoided additives) -->
      ${notedAdditivesHtml}

      <!-- Nutrition Table -->
      <div class="detail-section">
        <h3 class="section-title">Nutrition Facts</h3>
        <table class="nutrition-table">
          <thead>
            <tr>
              <th>Nutrient</th>
              <th class="text-right">Per 100g</th>
              <th class="text-right">Per Serving</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td>${r.label}</td>
                <td class="text-right font-mono">${r.p100 || '—'}</td>
                <td class="text-right font-mono text-muted">${r.pServ || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Ingredients List -->
      <div class="detail-section">
        <h3 class="section-title">Ingredients</h3>
        <p class="ingredients-text">${ingredients}</p>
      </div>

      <!-- Scan Another CTA -->
      <div class="pt-2">
        <button onclick="startScannerFlow()" class="btn-primary w-full">
          Scan Another Product
        </button>
      </div>
    </div>
  `;
}

/**
 * Primary handler when a barcode is detected by camera or typed manually
 * Wires to Open Food Facts API v2
 */
async function handleBarcodeDetected(code, format = 'standard') {
  console.log('handleBarcodeDetected called with code:', code, 'format:', format);
  const cleanCode = String(code).trim();
  if (!cleanCode) return;

  // Stop camera stream immediately
  await stopScannerFlow();

  // Check in-memory session cache
  if (productSessionCache.has(cleanCode)) {
    console.log('[Cache Hit] Returning cached product for:', cleanCode);
    renderProductDetailView(productSessionCache.get(cleanCode));
    return;
  }

  // Show loading skeleton while fetch is in flight
  renderLoadingSkeleton(cleanCode);

  const endpoint = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BarcodeScannerApp - OpenFoodFacts - Version 1.0',
        Accept: 'application/json',
      },
    });

    clearTimeout(timer);

    if (!response.ok && response.status >= 500) {
      renderNetworkError(cleanCode, `Open Food Facts server error (${response.status})`);
      return;
    }

    const data = await response.json();

    // "If status is not "1" (product not found), call handleProductNotFound(code)"
    if (data.status !== 1 || !data.product) {
      handleProductNotFound(cleanCode);
      return;
    }

    // Record scan in history (max 200)
    recordScanInHistory({
      barcode: cleanCode,
      source: 'openfoodfacts',
      productName: data.product.product_name || data.product.product_name_en || 'Food Product',
      brand: data.product.brands,
      imageUrl: data.product.image_front_url || data.product.image_url,
      cachedData: data.product,
    });

    // Cache successful lookup in memory for the session
    productSessionCache.set(cleanCode, data.product);

    // Render complete product view
    renderProductDetailView(data.product);
  } catch (err) {
    console.error('Network request error fetching from Open Food Facts:', err);
    renderNetworkError(
      cleanCode,
      err.name === 'AbortError'
        ? 'Request timed out while connecting to Open Food Facts.'
        : 'Network failure. Please check your device internet connection.'
    );
  }
}

/**
 * Stops camera streams and scanner loops
 */
async function stopScannerFlow() {
  isScanningActive = false;

  if (cameraAnimationFrame) {
    cancelAnimationFrame(cameraAnimationFrame);
    cameraAnimationFrame = null;
  }

  if (html5QrCodeScanner) {
    try {
      if (html5QrCodeScanner.isScanning) {
        await html5QrCodeScanner.stop();
      }
      await html5QrCodeScanner.clear();
    } catch (e) {
      console.warn('html5QrCode stop error:', e);
    }
    html5QrCodeScanner = null;
  }

  if (currentMediaStream) {
    currentMediaStream.getTracks().forEach((track) => track.stop());
    currentMediaStream = null;
  }

  const video = document.getElementById('camera-video');
  if (video) video.srcObject = null;
}

/**
 * Starts the camera scanner UI & video stream
 */
async function startScannerFlow() {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  mainView.innerHTML = `
    <div class="scanner-wrapper">
      <div id="camera-viewport" class="camera-viewport">
        <video id="camera-video" class="camera-video" playsinline muted autoplay></video>
        <div id="html5qr-mount" class="camera-video" style="display:none;"></div>
        <div class="viewfinder-container">
          <div class="viewfinder-box">
            <div class="corner-bracket corner-tl"></div>
            <div class="corner-bracket corner-tr"></div>
            <div class="corner-bracket corner-bl"></div>
            <div class="corner-bracket corner-br"></div>
            <div class="laser-line-wrapper">
              <div class="laser-line"></div>
            </div>
          </div>
          <span class="viewfinder-guide">Align barcode inside frame</span>
        </div>
      </div>

      <!-- Manual Entry Fallback -->
      <div class="manual-card">
        <form onsubmit="handleManualFormSubmit(event)">
          <label for="manual-barcode-input" class="result-label">Enter Barcode Manually</label>
          <div style="display: flex; gap: 0.5rem;">
            <input
              id="manual-barcode-input"
              type="text"
              class="input-field"
              placeholder="e.g. 3017620422003 (Nutella) or 7622210449283"
              required
            />
            <button type="submit" class="btn-primary" style="width: auto; padding: 0.75rem 1rem;">
              Lookup
            </button>
          </div>
        </form>
      </div>

      <!-- Recent Scans Persistent History Preview on Main Screen -->
      ${renderRecentScansPreviewHtml()}
    </div>
  `;

  await stopScannerFlow();

  try {
    const nativeCheck = await checkNativeBarcodeSupport();

    if (nativeCheck.supported) {
      const detector = new window.BarcodeDetector({ formats: nativeCheck.formats });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      currentMediaStream = stream;
      const video = document.getElementById('camera-video');
      if (!video) return;

      video.srcObject = stream;
      await video.play();
      isScanningActive = true;

      const scanLoop = async () => {
        if (!isScanningActive) return;
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          try {
            const codes = await detector.detect(video);
            if (codes && codes.length > 0) {
              triggerDetectionHaptic();
              playDetectionBeep();
              await stopScannerFlow();
              handleBarcodeDetected(codes[0].rawValue, codes[0].format);
              return;
            }
          } catch {
            // frame pass
          }
        }
        cameraAnimationFrame = requestAnimationFrame(scanLoop);
      };
      cameraAnimationFrame = requestAnimationFrame(scanLoop);
    } else {
      // Fallback: html5-qrcode
      if (!window.Html5Qrcode) {
        throw new Error('html5-qrcode library not loaded');
      }
      const mountEl = document.getElementById('html5qr-mount');
      if (mountEl) mountEl.style.display = 'block';

      html5QrCodeScanner = new window.Html5Qrcode('html5qr-mount');
      await html5QrCodeScanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 280, height: 180 } },
        async (decodedText, decodedResult) => {
          const format = decodedResult?.result?.format?.formatName || 'standard';
          triggerDetectionHaptic();
          playDetectionBeep();
          await stopScannerFlow();
          handleBarcodeDetected(decodedText, format);
        },
        () => {}
      );
      isScanningActive = true;
    }
  } catch (err) {
    console.error('Camera permission or initialization error:', err);
    renderPermissionDenied(err);
  }
}

function renderPermissionDenied(err) {
  const mainView = document.getElementById('app-main-content');
  if (!mainView) return;

  mainView.innerHTML = `
    <div class="permission-box">
      <div class="permission-icon">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 class="status-title">Camera Access Denied</h2>
      <p class="status-subtitle">
        Please allow camera access in your browser settings to scan barcodes directly.
      </p>
      <button onclick="startScannerFlow()" class="btn-primary">Try Again</button>
    </div>
  `;
}

function handleManualFormSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('manual-barcode-input');
  if (!input || !input.value.trim()) return;
  triggerDetectionHaptic();
  playDetectionBeep();
  handleBarcodeDetected(input.value.trim(), 'manual');
}

// Global exposure
if (typeof window !== 'undefined') {
  window.handleBarcodeDetected = handleBarcodeDetected;
  window.handleProductNotFound = handleProductNotFound;
  window.startScannerFlow = startScannerFlow;
  window.handleManualFormSubmit = handleManualFormSubmit;
  window.renderGeminiProductView = renderGeminiProductView;
  window.renderGeminiNotFoundView = renderGeminiNotFoundView;
  window.renderGeminiSearching = renderGeminiSearching;
  window.openDietarySettingsModal = openDietarySettingsModal;
  window.closeDietarySettingsModal = closeDietarySettingsModal;
  window.resetDietaryProfileModal = resetDietaryProfileModal;
  window.saveDietaryProfileFromModal = saveDietaryProfileFromModal;
  window.getDietaryProfile = getDietaryProfile;
  window.saveDietaryProfile = saveDietaryProfile;
  // History & Favorites methods
  window.getScanHistory = getScanHistory;
  window.saveScanHistory = saveScanHistory;
  window.recordScanInHistory = recordScanInHistory;
  window.openHistoryModal = openHistoryModal;
  window.closeHistoryModal = closeHistoryModal;
  window.setHistoryFilterTab = setHistoryFilterTab;
  window.handleHistorySearchInput = handleHistorySearchInput;
  window.clearHistorySearchInput = clearHistorySearchInput;
  window.toggleFavoriteFromHistory = toggleFavoriteFromHistory;
  window.deleteHistoryItemFromModal = deleteHistoryItemFromModal;
  window.confirmClearAllHistory = confirmClearAllHistory;
  window.closeConfirmClearDialog = closeConfirmClearDialog;
  window.executeClearAllHistory = executeClearAllHistory;
  window.reopenFromHistory = reopenFromHistory;
  window.toggleFavoriteFromCurrentProduct = toggleFavoriteFromCurrentProduct;
  window.toggleFavoriteFromHomePreview = toggleFavoriteFromHomePreview;
  window.isBarcodeFavorited = isBarcodeFavorited;
  window.clearAllHistory = clearAllHistory;
}
