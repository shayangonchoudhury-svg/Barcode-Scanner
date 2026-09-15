import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  AlertCircle,
} from 'lucide-react';
import { UserDietaryProfile } from '../types';
import {
  getUserDietaryProfile,
  saveUserDietaryProfile,
  COMMON_ALLERGEN_DEFINITIONS,
  DEFAULT_USER_PROFILE,
} from '../utils/allergenChecker';

interface DietarySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: UserDietaryProfile) => void;
}

export const DietarySettingsModal: React.FC<DietarySettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [profile, setProfile] = useState<UserDietaryProfile>(getUserDietaryProfile());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setProfile(getUserDietaryProfile());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAllergen = (key: keyof UserDietaryProfile['allergens']) => {
    setProfile((prev) => ({
      ...prev,
      allergens: {
        ...prev.allergens,
        [key]: !prev.allergens[key],
      },
    }));
  };

  const handleToggleDietaryFlag = (key: keyof UserDietaryProfile['dietaryFlags']) => {
    setProfile((prev) => ({
      ...prev,
      dietaryFlags: {
        ...prev.dietaryFlags,
        [key]: !prev.dietaryFlags[key],
      },
    }));
  };

  const handleSave = () => {
    const updated: UserDietaryProfile = {
      ...profile,
      isConfigured: true,
    };
    saveUserDietaryProfile(updated);
    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleClearAll = () => {
    const cleared: UserDietaryProfile = {
      ...DEFAULT_USER_PROFILE,
      isConfigured: true,
    };
    setProfile(cleared);
  };

  const allergenEntries = Object.entries(COMMON_ALLERGEN_DEFINITIONS) as [
    keyof UserDietaryProfile['allergens'],
    { name: string; keywords: string[] }
  ][];

  const dietaryFlagLabels: Record<keyof UserDietaryProfile['dietaryFlags'], { label: string; desc: string }> = {
    vegan: { label: 'Vegan', desc: 'Flags meats, dairy, eggs, honey, gelatin, and animal by-products' },
    vegetarian: { label: 'Vegetarian', desc: 'Flags meats, poultry, seafood, animal rennet, and gelatin' },
    halal: { label: 'Halal', desc: 'Flags pork, lard, alcohol, and non-halal animal products' },
    kosher: { label: 'Kosher', desc: 'Flags pork, shellfish, and non-kosher ingredients' },
    lowSodium: { label: 'Low-Sodium Diet', desc: 'Warns when salt exceeds 1.2g per 100g' },
    diabeticFriendly: { label: 'Diabetic-Friendly', desc: 'Warns when sugars exceed 15g per 100g or contains high-fructose syrups' },
  };

  return (
    <div
      id="dietary-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="dietary-settings-modal"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                Allergen & Dietary Profile
              </h2>
              <p className="text-xs text-zinc-400">
                Cross-checks every scanned product automatically
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="px-5 py-5 overflow-y-auto space-y-6 flex-1 text-zinc-200">
          {/* Intro Card */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300 leading-relaxed">
              Select your allergies and dietary preferences. Whenever you scan a product, the ingredient list is analyzed instantly and flags any matches at the very top of the screen.
            </p>
          </div>

          {/* Section 1: Common Allergens Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Common Allergens</span>
                <span className="text-[10px] text-zinc-500 lowercase">({allergenEntries.length} major)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allergenEntries.map(([key, def]) => {
                const checked = profile.allergens[key];
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      checked
                        ? 'bg-red-950/40 border-red-500/60 text-white'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAllergen(key)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                        checked
                          ? 'bg-red-500 border-red-400 text-white'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold">{def.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 2: Free-text Custom Allergens / Ingredients */}
          <div className="space-y-2">
            <label
              htmlFor="custom-allergens-input"
              className="text-xs font-bold text-amber-400 uppercase tracking-wider block"
            >
              Other Allergens & Ingredients to Avoid
            </label>
            <p className="text-[11px] text-zinc-400">
              Enter any additional ingredients separated by commas (e.g. mustard, sulfites, kiwi, palm oil, red dye).
            </p>
            <textarea
              id="custom-allergens-input"
              value={profile.customAllergens}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, customAllergens: e.target.value }))
              }
              rows={2}
              placeholder="e.g. mustard, sulfites, kiwi, palm oil"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
          </div>

          {/* Section 3: Dietary Flags */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Dietary & Health Flags
            </h3>

            <div className="space-y-2">
              {(
                Object.entries(dietaryFlagLabels) as [
                  keyof UserDietaryProfile['dietaryFlags'],
                  { label: string; desc: string }
                ][]
              ).map(([flagKey, { label, desc }]) => {
                const active = profile.dietaryFlags[flagKey];
                return (
                  <label
                    key={flagKey}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      active
                        ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => handleToggleDietaryFlag(flagKey)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                        active
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold block text-zinc-100">
                        {label}
                      </span>
                      <span className="text-[11px] text-zinc-400 block leading-tight mt-0.5">
                        {desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-dietary-profile-btn"
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-950/60 flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
