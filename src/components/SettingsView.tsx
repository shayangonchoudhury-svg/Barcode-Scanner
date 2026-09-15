import React, { useState } from 'react';
import {
  ShieldAlert,
  Save,
  RotateCcw,
  Volume2,
  VolumeX,
  Vibrate,
  Download,
  Smartphone,
  CheckCircle2,
  Database,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { UserDietaryProfile, AllergenKey, DietaryFlagKey } from '../types';
import { ALLERGEN_OPTIONS, DIETARY_FLAG_OPTIONS } from '../utils/allergenChecker';
import { usePWAInstall } from '../utils/usePWAInstall';

interface SettingsViewProps {
  userProfile: UserDietaryProfile;
  onSaveProfile: (profile: UserDietaryProfile) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  vibrateEnabled: boolean;
  onToggleVibrate: () => void;
  historyCount: number;
  onClearHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  onSaveProfile,
  soundEnabled,
  onToggleSound,
  vibrateEnabled,
  onToggleVibrate,
  historyCount,
  onClearHistory,
}) => {
  const [allergens, setAllergens] = useState(userProfile.allergens);
  const [dietaryFlags, setDietaryFlags] = useState(userProfile.dietaryFlags);
  const [customAllergens, setCustomAllergens] = useState(userProfile.customAllergens);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const toggleAllergen = (key: AllergenKey) => {
    setAllergens((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFlag = (key: DietaryFlagKey) => {
    setDietaryFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserDietaryProfile = {
      allergens,
      customAllergens,
      dietaryFlags,
      isConfigured: true,
    };
    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    const emptyAllergens: Record<AllergenKey, boolean> = {
      peanuts: false,
      treeNuts: false,
      dairy: false,
      egg: false,
      gluten: false,
      soy: false,
      shellfish: false,
      sesame: false,
    };
    const emptyFlags: Record<DietaryFlagKey, boolean> = {
      vegan: false,
      vegetarian: false,
      halal: false,
      kosher: false,
      lowSodium: false,
      diabeticFriendly: false,
    };
    setAllergens(emptyAllergens);
    setDietaryFlags(emptyFlags);
    setCustomAllergens('');
  };

  return (
    <div id="settings-view" className="w-full max-w-md flex flex-col gap-6 pb-20">
      {/* Title Card */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Dietary & App Settings</h2>
            <p className="text-xs text-zinc-400">Configure personal safety cross-checks and preferences</p>
          </div>
        </div>
      </div>

      {/* PWA Install Banner */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">App Installation</h3>
              <p className="text-xs text-zinc-400">Install to your home screen for quick offline access</p>
            </div>
          </div>
          {isInstalled && (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Installed
            </span>
          )}
        </div>

        {isInstallable && (
          <button
            onClick={install}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Install Barcode Scanner App</span>
          </button>
        )}

        {isIOS && !isInstalled && (
          <div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>How to Install on iPhone / iPad</span>
            </button>
            {showIOSGuide && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300 space-y-1.5 animate-in fade-in">
                <p className="font-semibold text-white">iOS Safari Installation:</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                  <li>Tap the <strong className="text-white">Share</strong> button (box with arrow) in Safari.</li>
                  <li>Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.</li>
                  <li>Tap <strong className="text-white">Add</strong> in the top-right corner.</li>
                </ol>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
                >
                  Dismiss Guide
                </button>
              </div>
            )}
          </div>
        )}

        {!isInstallable && !isIOS && !isInstalled && (
          <p className="text-[11px] text-zinc-500">
            Open in Chrome, Edge, or Safari to install as a standalone PWA.
          </p>
        )}
      </div>

      {/* Audio & Haptic Feedback Controls */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white">Hardware Feedback</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onToggleSound}
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <VolumeX className="w-5 h-5 text-zinc-500 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold leading-tight">Beep Sound</p>
              <p className="text-[10px] text-zinc-400">{soundEnabled ? 'Enabled' : 'Muted'}</p>
            </div>
          </button>

          <button
            onClick={onToggleVibrate}
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
              vibrateEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <Vibrate
              className={`w-5 h-5 shrink-0 ${
                vibrateEnabled ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            />
            <div>
              <p className="text-xs font-bold leading-tight">Vibration</p>
              <p className="text-[10px] text-zinc-400">{vibrateEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Allergen & Dietary Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Common Allergens */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Common Allergens</h3>
            <span className="text-[11px] text-red-400 font-medium">Auto-crosscheck</span>
          </div>
          <p className="text-xs text-zinc-400">
            Every product scan checks ingredients and tags against these alerts:
          </p>

          <div className="grid grid-cols-2 gap-2 mt-1">
            {ALLERGEN_OPTIONS.map((item) => {
              const isChecked = allergens[item.key];
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => toggleAllergen(item.key)}
                  className={`px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-red-950/40 border-red-500/60 text-red-200'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-semibold">{item.label}</span>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                      isChecked ? 'bg-red-500 text-white' : 'border border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {isChecked && '✓'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Allergens */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
          <label htmlFor="custom-allergens-input" className="text-sm font-bold text-white">
            Custom Allergen Keywords
          </label>
          <p className="text-xs text-zinc-400">
            Comma-separated ingredients (e.g. <em>mustard, coconut, celery, sulfites</em>):
          </p>
          <input
            id="custom-allergens-input"
            type="text"
            value={customAllergens}
            onChange={(e) => setCustomAllergens(e.target.value)}
            placeholder="e.g. mustard, coconut, lupin"
            className="w-full mt-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Dietary Flags */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white">Dietary Requirements & Goals</h3>
          <p className="text-xs text-zinc-400">
            Flags products that conflict with your nutritional lifestyle:
          </p>

          <div className="grid grid-cols-2 gap-2 mt-1">
            {DIETARY_FLAG_OPTIONS.map((item) => {
              const isChecked = dietaryFlags[item.key];
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => toggleFlag(item.key)}
                  className={`px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-semibold">{item.label}</span>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                      isChecked ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {isChecked && '✓'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Profile saved! All future scans will be cross-referenced against your settings.</span>
          </div>
        )}
      </form>

      {/* Storage Management */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold text-white">Local Storage & History</h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">{historyCount} scans stored</span>
        </div>
        <p className="text-xs text-zinc-400">
          Scans and favorites are stored offline in your browser. Capped at 200 items.
        </p>

        {confirmClearOpen ? (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 flex flex-col gap-2 animate-in fade-in">
            <p className="text-xs text-red-200 font-medium">Are you sure you want to erase all scan history?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClearOpen(false);
                }}
                className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={historyCount === 0}
            className="w-full py-2 px-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Scan History</span>
          </button>
        )}
      </div>
    </div>
  );
};
