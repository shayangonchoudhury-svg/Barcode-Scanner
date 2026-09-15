import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldQuestion, ExternalLink, Settings } from 'lucide-react';
import { AllergenCheckResult } from '../types';

interface AllergenAlertBannerProps {
  result: AllergenCheckResult;
  onOpenSettings?: () => void;
}

export const AllergenAlertBanner: React.FC<AllergenAlertBannerProps> = ({
  result,
  onOpenSettings,
}) => {
  // Case 1: Active violations matched! Prominent red warning banner.
  if (result.hasViolations) {
    return (
      <div
        id="allergen-violation-banner"
        className="w-full bg-red-950/95 border-2 border-red-500 rounded-2xl p-4 shadow-xl shadow-red-950/60 text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-400 flex items-center justify-center text-red-200 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse text-red-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                  Warning
                </span>
                <span className="text-xs text-red-200 font-medium">
                  {result.violations.length} restriction{result.violations.length > 1 ? 's' : ''} triggered
                </span>
              </div>
              <h3 className="text-sm font-black text-white tracking-tight mt-0.5">
                Allergen & Dietary Profile Alert
              </h3>
            </div>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[11px] text-red-300 hover:text-white px-2 py-1 rounded-lg bg-red-900/60 border border-red-700/60 hover:bg-red-800 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Edit your dietary profile"
            >
              <Settings className="w-3 h-3" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Breakdown of exactly which allergen/restriction was matched and what triggered it */}
        <div className="space-y-2 pt-1">
          {result.violations.map((violation, idx) => (
            <div
              key={`${violation.name}-${idx}`}
              className="bg-black/40 border border-red-500/40 rounded-xl p-2.5 flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-red-200 bg-red-500/25 px-2 py-0.5 rounded text-[11px]">
                    {violation.name}
                  </span>
                </div>
                <p className="text-red-100/90 mt-1 leading-relaxed font-mono text-[11px]">
                  {violation.trigger}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-red-200/80 leading-snug pt-0.5">
          Always review the physical package label. Cross-contamination risk may exist even if not listed in ingredient statements.
        </p>
      </div>
    );
  }

  // Case 2: Fallback result without ingredients list, but user has active profile
  // "show a neutral 'could not verify allergens — ingredient data not available for this product' notice rather than staying silent"
  if (result.isUnknownFallback && result.hasActiveProfile) {
    return (
      <div
        id="allergen-unverified-banner"
        className="w-full bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-3.5 text-zinc-200 space-y-2 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <ShieldQuestion className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Notice
              </span>
              <span className="text-xs font-semibold text-zinc-200">
                Could not verify allergens
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              Ingredient data is not available for this web-sourced product. Your active dietary profile could not be verified automatically.
            </p>
            <p className="text-[11px] text-amber-400/90 mt-1">
              Do not mistake the absence of a warning for an all-clear. Please inspect the product packaging before consuming.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
