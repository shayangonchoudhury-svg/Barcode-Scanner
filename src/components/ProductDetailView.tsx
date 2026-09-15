import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Copy,
  Check,
  AlertOctagon,
  FlaskConical,
  Wheat,
  Scale,
  Sparkles,
  ExternalLink,
  Package,
  Star,
} from 'lucide-react';
import { ProductData, UserDietaryProfile } from '../types';
import {
  getNutriScoreInfo,
  getNovaGroupInfo,
  getEcoScoreInfo,
} from '../utils/openFoodFacts';
import {
  checkProductAgainstProfile,
  findNotedAdditives,
} from '../utils/allergenChecker';
import { AllergenAlertBanner } from './AllergenAlertBanner';
import { NotedAdditivesSection } from './NotedAdditivesSection';
import { ManufacturerSection } from './ManufacturerSection';
import { BatchExpirySection } from './BatchExpirySection';
import { PriceHistorySection } from './PriceHistorySection';

interface ProductDetailViewProps {
  product: ProductData;
  userProfile: UserDietaryProfile;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onScanAnother: () => void;
  onScanSecondaryCode?: () => void;
  onOpenSettings?: () => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  userProfile,
  isFavorite = false,
  onToggleFavorite,
  onScanAnother,
  onScanSecondaryCode,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const nutriScore = getNutriScoreInfo(product.nutriscoreGrade);
  const novaGroup = getNovaGroupInfo(product.novaGroup);
  const ecoScore = getEcoScoreInfo(product.ecoscoreGrade);

  // Cross-reference against user's personal dietary & allergen profile
  const allergenCheck = useMemo(
    () => checkProductAgainstProfile(product, userProfile),
    [product, userProfile]
  );

  // Identify commonly-avoided additives for neutral factual notes
  const notedAdditives = useMemo(
    () => findNotedAdditives(product),
    [product]
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(product.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Nutrition items definition for the table
  const nutriments = product.nutriments;
  const nutritionRows = [
    {
      label: 'Energy',
      p100: nutriments.energyKcal100g !== null && nutriments.energyKcal100g !== undefined ? `${nutriments.energyKcal100g} kcal` : null,
      pServing: nutriments.energyKcalServing !== null && nutriments.energyKcalServing !== undefined ? `${nutriments.energyKcalServing} kcal` : null,
    },
    {
      label: 'Fat',
      p100: nutriments.fat100g !== null && nutriments.fat100g !== undefined ? `${nutriments.fat100g} g` : null,
      pServing: nutriments.fatServing !== null && nutriments.fatServing !== undefined ? `${nutriments.fatServing} g` : null,
    },
    {
      label: 'Saturated Fat',
      p100: nutriments.saturatedFat100g !== null && nutriments.saturatedFat100g !== undefined ? `${nutriments.saturatedFat100g} g` : null,
      pServing: nutriments.saturatedFatServing !== null && nutriments.saturatedFatServing !== undefined ? `${nutriments.saturatedFatServing} g` : null,
    },
    {
      label: 'Sugars',
      p100: nutriments.sugars100g !== null && nutriments.sugars100g !== undefined ? `${nutriments.sugars100g} g` : null,
      pServing: nutriments.sugarsServing !== null && nutriments.sugarsServing !== undefined ? `${nutriments.sugarsServing} g` : null,
    },
    {
      label: 'Salt',
      p100: nutriments.salt100g !== null && nutriments.salt100g !== undefined ? `${nutriments.salt100g} g` : null,
      pServing: nutriments.saltServing !== null && nutriments.saltServing !== undefined ? `${nutriments.saltServing} g` : null,
    },
    {
      label: 'Protein',
      p100: nutriments.proteins100g !== null && nutriments.proteins100g !== undefined ? `${nutriments.proteins100g} g` : null,
      pServing: nutriments.proteinsServing !== null && nutriments.proteinsServing !== undefined ? `${nutriments.proteinsServing} g` : null,
    },
    {
      label: 'Fiber',
      p100: nutriments.fiber100g !== null && nutriments.fiber100g !== undefined ? `${nutriments.fiber100g} g` : null,
      pServing: nutriments.fiberServing !== null && nutriments.fiberServing !== undefined ? `${nutriments.fiberServing} g` : null,
    },
  ];

  const hasAnyNutrition = nutritionRows.some((r) => r.p100 !== null || r.pServing !== null);

  return (
    <div
      id="product-detail-view"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* ⚠️ Prominent Warning Banner at the very top, above the product name (Requirement: first thing visible) */}
      <AllergenAlertBanner
        result={allergenCheck}
        onOpenSettings={onOpenSettings}
      />

      {/* Top Bar: Brand, Barcode, and Scan Another Button */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
            title="Click to copy barcode"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>{product.code}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleFavorite && (
            <button
              id="btn-favorite-product"
              onClick={onToggleFavorite}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                isFavorite
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title={isFavorite ? 'Favorited' : 'Add to Favorites'}
              aria-label="Toggle Favorite"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isFavorite ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'
                }`}
              />
              <span className="text-[11px] hidden sm:inline">
                {isFavorite ? 'Saved' : 'Favorite'}
              </span>
            </button>
          )}

          <button
            id="btn-scan-another-top"
            onClick={onScanAnother}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Another</span>
          </button>
        </div>
      </div>

      {/* Main Header: Product Image + Brand + Name + Quantity */}
      <div className="flex gap-4 items-start">
        {product.imageUrl && !imageError ? (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
            <img
              src={product.imageUrl}
              alt={product.productName}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-zinc-600 shrink-0 p-2 text-center">
            <Package className="w-8 h-8 mb-1 text-zinc-500" />
            <span className="text-[10px] text-zinc-500">No Image</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 truncate">
            {product.brands}
          </p>
          <h2 className="text-lg font-bold text-zinc-100 leading-snug break-words">
            {product.productName}
          </h2>
          {product.quantity && (
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              <Scale className="w-3 h-3 text-zinc-500" />
              <span>{product.quantity}</span>
            </p>
          )}
        </div>
      </div>

      {/* Official Score Badges: Nutri-Score, NOVA Group, Eco-Score */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Product Health & Quality Ratings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Nutri-Score Badge */}
          {nutriScore ? (
            <div className="bg-zinc-950 rounded-2xl p-3 border border-zinc-800/90 flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className={`w-9 h-9 rounded-xl ${nutriScore.bgColor} ${nutriScore.textColor} flex items-center justify-center font-bold text-lg shadow-sm shrink-0`}
                >
                  {nutriScore.grade}
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200">
                    {nutriScore.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    Nutrition Rating
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {nutriScore.explanation}
              </p>
            </div>
          ) : (
            <div className="bg-zinc-950/60 rounded-2xl p-3 border border-zinc-800/50 text-[11px] text-zinc-500 flex items-center justify-center">
              Nutri-Score not available
            </div>
          )}

          {/* NOVA Group Badge */}
          {novaGroup ? (
            <div className="bg-zinc-950 rounded-2xl p-3 border border-zinc-800/90 flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className={`w-9 h-9 rounded-xl ${novaGroup.bgColor} ${novaGroup.textColor} flex items-center justify-center font-bold text-lg shadow-sm shrink-0`}
                >
                  {novaGroup.grade}
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200">
                    {novaGroup.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    Food Processing Level
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {novaGroup.explanation}
              </p>
            </div>
          ) : (
            <div className="bg-zinc-950/60 rounded-2xl p-3 border border-zinc-800/50 text-[11px] text-zinc-500 flex items-center justify-center">
              NOVA group not available
            </div>
          )}
        </div>

        {/* Eco-Score (if present) */}
        {ecoScore && (
          <div className="bg-zinc-950 rounded-2xl p-3 border border-zinc-800/90 flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl ${ecoScore.bgColor} ${ecoScore.textColor} flex items-center justify-center font-bold text-base shadow-sm shrink-0`}
            >
              {ecoScore.grade}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">
                  {ecoScore.label}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">Eco Impact</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                {ecoScore.explanation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Allergens Warning Chips (clearly visible, not buried) */}
      <div className="bg-zinc-950/90 rounded-2xl p-3.5 border border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Allergen Alerts
          </h4>
        </div>

        {product.allergens && product.allergens.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {product.allergens.map((allergen, idx) => (
              <span
                key={`${allergen}-${idx}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {allergen}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            No specific allergens tagged by manufacturer.
          </p>
        )}
      </div>

      {/* Additives List with E-numbers */}
      <div className="bg-zinc-950/90 rounded-2xl p-3.5 border border-zinc-800">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Food Additives ({product.additives.length})
            </h4>
          </div>
          {product.additives.length === 0 && (
            <span className="text-[10px] text-emerald-400 font-medium">None detected</span>
          )}
        </div>

        {product.additives && product.additives.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {product.additives.map((additive) => (
              <span
                key={additive.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] bg-purple-500/10 text-purple-300 border border-purple-500/25"
                title={additive.name}
              >
                <span className="font-mono font-bold text-purple-200">{additive.id}</span>
                {additive.name !== additive.id && (
                  <span className="text-[10px] text-zinc-400 max-w-[120px] truncate">
                    {additive.name}
                  </span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            No additive E-numbers declared in Open Food Facts data.
          </p>
        )}
      </div>

      {/* Factual Noted Additives Breakdown (food dyes, aspartame, MSG, HFCS, etc.) */}
      <NotedAdditivesSection additives={notedAdditives} />

      {/* Nutrition Table (per 100g and per serving) */}
      <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Nutrition Facts
          </h4>
          {product.servingSize && (
            <span className="text-[11px] text-zinc-400 font-mono">
              Serving: {product.servingSize}
            </span>
          )}
        </div>

        {hasAnyNutrition ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                  <th className="py-1.5 font-medium">Nutrient</th>
                  <th className="py-1.5 font-medium text-right">Per 100g</th>
                  <th className="py-1.5 font-medium text-right">Per Serving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {nutritionRows.map((row) => (
                  <tr key={row.label} className="hover:bg-zinc-900/40">
                    <td className="py-2 text-zinc-300 font-medium">{row.label}</td>
                    <td className="py-2 text-right font-mono text-zinc-200">
                      {row.p100 || '—'}
                    </td>
                    <td className="py-2 text-right font-mono text-zinc-400">
                      {row.pServing || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Detailed nutrition table not available for this product.
          </p>
        )}
      </div>

      {/* Ingredients List */}
      <div className="bg-zinc-950/90 rounded-2xl p-4 border border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <Wheat className="w-4 h-4 text-emerald-400 shrink-0" />
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Ingredients
          </h4>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          {product.ingredientsText || 'No ingredients list provided on packaging or database.'}
        </p>
      </div>

      {/* 1. Manufacturer Section */}
      <ManufacturerSection manufacturer={product.manufacturer} />

      {/* 2. Batch & Expiry Section with GS1 parser / Manual entry */}
      <BatchExpirySection
        barcode={product.code}
        onScanSecondaryCode={onScanSecondaryCode || onScanAnother}
      />

      {/* 3. Personal Price Tracking Section */}
      <PriceHistorySection barcode={product.code} />

      {/* Bottom Action Footer */}
      <div className="pt-2 flex flex-col gap-2.5">
        <button
          id="btn-scan-another-footer"
          onClick={onScanAnother}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Scan Another Product</span>
        </button>

        <a
          href={`https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <span>View on Open Food Facts website</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
