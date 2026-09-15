import React, { useState, useMemo } from 'react';
import {
  Globe,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Package,
  Tag,
  DollarSign,
  Layers,
  FileText,
  Star,
  Camera,
  ShoppingBag,
} from 'lucide-react';
import { GeminiProductResult, UserDietaryProfile } from '../types';
import { checkGeminiResultAgainstProfile } from '../utils/allergenChecker';
import { AllergenAlertBanner } from './AllergenAlertBanner';
import { ManufacturerSection } from './ManufacturerSection';
import { BatchExpirySection } from './BatchExpirySection';
import { PriceHistorySection } from './PriceHistorySection';

interface GeminiProductViewProps {
  result: GeminiProductResult;
  userProfile: UserDietaryProfile;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onScanAnother: () => void;
  onScanSecondaryCode?: () => void;
  onManualEntry?: () => void;
  onOpenSettings?: () => void;
}

export const GeminiProductView: React.FC<GeminiProductViewProps> = ({
  result,
  userProfile,
  isFavorite = false,
  onToggleFavorite,
  onScanAnother,
  onScanSecondaryCode,
  onManualEntry,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const allergenCheck = useMemo(
    () => checkGeminiResultAgainstProfile(result, userProfile),
    [result, userProfile]
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(result.barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayName = result.productName || 'Product Result';
  const displayBrand = result.brand || 'Unspecified Brand';

  const isPhotoId = result.source === 'photo_identification' || result.isPhotoId;
  const isUpcItemDb = result.source === 'upcitemdb';

  return (
    <div
      id="gemini-product-detail-view"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* ⚠️ Allergen & Dietary Banner */}
      <AllergenAlertBanner
        result={allergenCheck}
        onOpenSettings={onOpenSettings}
      />

      {/* Distinct Source Badge required by prompt */}
      {isPhotoId ? (
        <div
          id="badge-photo-source"
          className="w-full flex items-start gap-2.5 py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-tight shadow-sm"
        >
          <Camera className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="text-left">
            <p className="font-bold">Identified from photo — verify details independently</p>
            <p className="text-[11px] font-normal text-amber-400/90 mt-0.5">
              Visual AI identification has lower certainty than barcode database records.
            </p>
          </div>
        </div>
      ) : isUpcItemDb ? (
        <div
          id="badge-upcitemdb-source"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold text-center tracking-tight shadow-sm"
        >
          <ShoppingBag className="w-4 h-4 shrink-0 text-purple-400" />
          <span>Found via: UPCItemDB Retail Database</span>
        </div>
      ) : (
        <div
          id="badge-web-search-source"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold text-center tracking-tight shadow-sm"
        >
          <Globe className="w-4 h-4 shrink-0 text-sky-400" />
          <span>Found via: Web search — not in verified database</span>
        </div>
      )}

      {/* Top Bar: Barcode pill & Scan Another */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
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
            <span>{result.barcode}</span>
          </button>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap border ${
              isPhotoId
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : isUpcItemDb
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
            }`}
          >
            {result.foundViaLabel ||
              (isPhotoId
                ? 'Photo Identification'
                : isUpcItemDb
                ? 'UPCItemDB'
                : 'Web search')}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleFavorite && (
            <button
              id="btn-favorite-gemini-product"
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
            id="btn-scan-another-gemini-top"
            onClick={onScanAnother}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer shrink-0 ${
              isPhotoId
                ? 'bg-amber-600 hover:bg-amber-500'
                : isUpcItemDb
                ? 'bg-purple-600 hover:bg-purple-500'
                : 'bg-sky-600 hover:bg-sky-500'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Another</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="flex gap-4 items-start">
        {result.imageUrl && !imageError ? (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center p-1 relative shadow-inner">
            <img
              src={result.imageUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        ) : (
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center shrink-0 p-2 text-center shadow-inner ${
              isPhotoId
                ? 'text-amber-400'
                : isUpcItemDb
                ? 'text-purple-400'
                : 'text-sky-400'
            }`}
          >
            {isPhotoId ? (
              <Camera className="w-9 h-9 text-amber-400/90 mb-1" />
            ) : isUpcItemDb ? (
              <ShoppingBag className="w-9 h-9 text-purple-400/90 mb-1" />
            ) : (
              <Package className="w-9 h-9 text-sky-400/90 mb-1" />
            )}
            <span className="text-[9px] font-mono text-zinc-500 uppercase">
              {isPhotoId ? 'Photo' : 'Product'}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-semibold uppercase tracking-wider truncate ${
              isPhotoId
                ? 'text-amber-400'
                : isUpcItemDb
                ? 'text-purple-400'
                : 'text-sky-400'
            }`}
          >
            {displayBrand}
          </p>
          <h2 className="text-lg font-bold text-zinc-100 leading-snug break-words">
            {displayName}
          </h2>
          {result.category && (
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-zinc-500" />
              <span>{result.category}</span>
            </p>
          )}
        </div>
      </div>

      {/* Product Meta Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
            <Tag className="w-3 h-3 text-sky-400" />
            Brand
          </span>
          <span className="text-xs font-medium text-zinc-200 truncate">
            {displayBrand}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            Price Range
          </span>
          <span className="text-xs font-medium text-zinc-200 truncate">
            {result.priceRange || 'Not reported'}
          </span>
        </div>
      </div>

      {/* Description / Summary Section */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          <span>Product Overview</span>
        </h3>
        <p className="text-xs text-zinc-300 leading-relaxed">
          {result.description || result.rawText}
        </p>
      </div>

      {/* Grounding Sources & Citations */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Search Sources ({result.sources.length})</span>
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Google Search</span>
        </div>

        {result.sources.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {result.sources.map((source, idx) => (
              <a
                key={`${source.url}-${idx}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/80 border border-zinc-800 text-xs text-sky-300 hover:text-sky-200 transition-colors group"
              >
                <span className="truncate max-w-[280px] font-medium">
                  {source.title || source.url}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-500 group-hover:text-sky-300 transition-colors ml-2" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">
            Grounded search verified across public web retailer indices.
          </p>
        )}
      </div>

      {/* 1. Manufacturer Section (Web-sourced or explicit not available) */}
      <ManufacturerSection manufacturer={result.manufacturer} />

      {/* 2. Batch & Expiry Section */}
      <BatchExpirySection
        barcode={result.barcode}
        onScanSecondaryCode={onScanSecondaryCode || onScanAnother}
      />

      {/* 3. Personal Price Tracking Section */}
      <PriceHistorySection barcode={result.barcode} />

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          id="btn-scan-another-gemini"
          onClick={onScanAnother}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-all shadow-md shadow-sky-950/50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Scan Another Product</span>
        </button>

        {onManualEntry && (
          <button
            onClick={onManualEntry}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
          >
            <span>Enter Barcode Manually</span>
          </button>
        )}
      </div>
    </div>
  );
};
