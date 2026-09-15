/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CameraScanner } from './components/CameraScanner';
import { ManualEntryForm } from './components/ManualEntryForm';
import { ProductDetailView } from './components/ProductDetailView';
import { ProductSkeleton } from './components/ProductSkeleton';
import { ProductNotFound } from './components/ProductNotFound';
import { NetworkErrorState } from './components/NetworkErrorState';
import { GeminiProductView } from './components/GeminiProductView';
import { GeminiNotFound } from './components/GeminiNotFound';
import { GeminiSearchingSkeleton } from './components/GeminiSearchingSkeleton';
import { PhotoIdentifyModal } from './components/PhotoIdentifyModal';
import { BottomNav, NavTab } from './components/BottomNav';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { OfflineBanner } from './components/OfflineBanner';
import { ScanConfirmation } from './components/ScanConfirmation';
import {
  ProductData,
  ProductFetchStatus,
  GeminiProductResult,
  UserDietaryProfile,
  HistoryScanItem,
} from './types';
import { playBeepSound, triggerHaptic } from './utils/scanner';
import { executeProductLookupChain } from './utils/productLookupChain';
import {
  getUserDietaryProfile,
  saveUserDietaryProfile,
  getActiveRestrictionsCount,
} from './utils/allergenChecker';
import {
  getStoredHistory,
  recordScanInHistory,
  toggleHistoryFavorite,
  removeHistoryEntry,
  clearAllStoredHistory,
} from './utils/historyStorage';
import { usePWAInstall } from './utils/usePWAInstall';
import { parseGS1Code } from './utils/gs1Parser';
import { saveBatchExpiryRecord } from './utils/batchExpiryStorage';
import {
  Scan,
  Keyboard,
  Volume2,
  VolumeX,
  Vibrate,
  History,
  Download,
  Wifi,
  WifiOff,
  QrCode,
  X,
  CheckCircle2,
  Camera,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Navigation Shell State
  const [activeNav, setActiveNav] = useState<NavTab>('scan');

  // Scanner View State
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const [productStatus, setProductStatus] = useState<ProductFetchStatus>('idle');
  const [currentProduct, setCurrentProduct] = useState<ProductData | null>(null);
  const [geminiResult, setGeminiResult] = useState<GeminiProductResult | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [lookupStep, setLookupStep] = useState<'off' | 'upcitemdb' | 'gemini'>('off');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);

  // Secondary code scanning for Batch & Expiry (GS1-128 / Data Matrix)
  const [secondaryScanTargetBarcode, setSecondaryScanTargetBarcode] = useState<string | null>(null);
  const [batchScanSuccessToast, setBatchScanSuccessToast] = useState<string | null>(null);

  // Scan Success Confirmation Overlay State
  const [confirmedBarcode, setConfirmedBarcode] = useState<string | null>(null);

  // Online / Offline Detection
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Persistent History (capped at 200 items in localStorage)
  const [history, setHistory] = useState<HistoryScanItem[]>(() => getStoredHistory());

  // Preferences: Audio & Vibration
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);

  // Dietary & Allergen Profile (stored in localStorage)
  const [userProfile, setUserProfile] = useState<UserDietaryProfile>(() => getUserDietaryProfile());

  const activeRestrictionsCount = useMemo(
    () => getActiveRestrictionsCount(userProfile),
    [userProfile]
  );

  // PWA Install Hook
  const { isInstallable, install } = usePWAInstall();

  // Monitor connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync document title per view & state
  useEffect(() => {
    if (activeNav === 'history') {
      document.title = `Scan History (${history.length}) – Barcode Scanner`;
    } else if (activeNav === 'settings') {
      document.title = 'Settings & Dietary Profile – Barcode Scanner';
    } else if (currentProduct) {
      document.title = `${currentProduct.productName} – Barcode Scanner`;
    } else if (geminiResult && geminiResult.productName) {
      document.title = `${geminiResult.productName} – Barcode Scanner`;
    } else {
      document.title = 'Barcode Scanner – Food & Product Intelligence';
    }
  }, [activeNav, history.length, currentProduct, geminiResult]);

  // Check if current active barcode is favorited
  const isCurrentProductFavorited = useMemo(() => {
    if (!activeBarcode) return false;
    return history.some((item) => item.barcode === activeBarcode && item.isFavorite);
  }, [activeBarcode, history]);

  // Toggle favorite
  const handleToggleFavorite = useCallback((barcode: string) => {
    const updated = toggleHistoryFavorite(barcode);
    setHistory(updated);
  }, []);

  // Delete history entry
  const handleDeleteHistoryEntry = useCallback((barcode: string) => {
    const updated = removeHistoryEntry(barcode);
    setHistory(updated);
  }, []);

  // Clear all history
  const handleClearAllHistory = useCallback(() => {
    const updated = clearAllStoredHistory();
    setHistory(updated);
  }, []);

  // Save dietary profile
  const handleSaveProfile = useCallback((profile: UserDietaryProfile) => {
    saveUserDietaryProfile(profile);
    setUserProfile(profile);
  }, []);

  /**
   * Reopen scan result immediately from memory/cache WITHOUT re-fetching!
   */
  const handleReopenHistoryItem = useCallback((item: HistoryScanItem) => {
    setActiveNav('scan');
    setActiveBarcode(item.barcode);
    setNetworkError(null);

    if (item.cachedProduct) {
      setCurrentProduct(item.cachedProduct);
      setGeminiResult(null);
      setProductStatus('found');
      return;
    }

    if (item.cachedGeminiResult) {
      setCurrentProduct(null);
      setGeminiResult(item.cachedGeminiResult);
      setProductStatus('gemini_found');
      return;
    }

    if (item.source === 'not_found') {
      setCurrentProduct(null);
      setGeminiResult(null);
      setProductStatus('gemini_not_found');
      return;
    }

    // Trigger fetch if un-cached
    handleBarcodeDetected(item.barcode, 'standard', 'manual');
  }, []);

  /**
   * Primary handler triggered when barcode is detected by camera or manual entry.
   * Executes the full sequential lookup chain:
   * Open Food Facts -> UPCItemDB -> Gemini Search Grounding -> Photo ID fallback -> Manual entry
   */
  const handleBarcodeDetected = useCallback(
    async (code: string, format = 'standard', source: 'native' | 'html5-qrcode' | 'manual' = 'manual') => {
      const cleanCode = code.trim();
      if (!cleanCode) return;

      // Check if we are specifically scanning for a secondary batch/expiry GS1 code
      if (secondaryScanTargetBarcode) {
        if (soundEnabled) playBeepSound();
        if (vibrateEnabled) triggerHaptic();

        const targetCode = secondaryScanTargetBarcode;
        const parsed = parseGS1Code(cleanCode);

        if (parsed.hasMatches) {
          saveBatchExpiryRecord({
            barcode: targetCode,
            batchNumber: parsed.batchNumber,
            manufactureDate: parsed.manufactureDate,
            expiryDate: parsed.expiryDate,
            source: 'gs1_barcode',
            rawGS1String: cleanCode,
            updatedAt: Date.now(),
          });
          setBatchScanSuccessToast(
            `GS1 Code parsed! Batch: ${parsed.batchNumber || '—'} | Exp: ${parsed.expiryDate || '—'}`
          );
        } else {
          // If no recognized GS1 AIs, save raw string if reasonable batch candidate
          saveBatchExpiryRecord({
            barcode: targetCode,
            batchNumber: cleanCode.length <= 40 ? cleanCode : undefined,
            source: 'gs1_barcode',
            rawGS1String: cleanCode,
            updatedAt: Date.now(),
          });
          setBatchScanSuccessToast(`Code detected: ${cleanCode.slice(0, 24)}. Saved to batch info.`);
        }

        setTimeout(() => setBatchScanSuccessToast(null), 4000);
        setSecondaryScanTargetBarcode(null);

        // Re-open previous product view
        if (currentProduct) {
          setProductStatus('found');
        } else if (geminiResult) {
          setProductStatus('gemini_found');
        }
        return;
      }

      // 1. Audio & Haptic confirmation
      if (soundEnabled) playBeepSound();
      if (vibrateEnabled) triggerHaptic();

      // 2. Visual scan confirmation animation
      setConfirmedBarcode(cleanCode);
      setTimeout(() => {
        setConfirmedBarcode(null);
      }, 550);

      setActiveBarcode(cleanCode);
      setProductStatus('loading');
      setLookupStep('off');
      setNetworkError(null);

      // 3. Offline check: if offline, check if item is in local history cache!
      if (!navigator.onLine) {
        const cachedItem = history.find((h) => h.barcode === cleanCode);
        if (cachedItem) {
          if (cachedItem.cachedProduct) {
            setCurrentProduct(cachedItem.cachedProduct);
            setGeminiResult(null);
            setProductStatus('found');
            return;
          }
          if (cachedItem.cachedGeminiResult) {
            setCurrentProduct(null);
            setGeminiResult(cachedItem.cachedGeminiResult);
            setProductStatus('gemini_found');
            return;
          }
        }
        setNetworkError(
          `You are offline. Product lookup for ${cleanCode} requires an internet connection. Previously scanned products are stored in your History.`
        );
        setProductStatus('network_error');
        return;
      }

      // 4. Run the full sequential product lookup chain
      try {
        const chainResult = await executeProductLookupChain(cleanCode, (step) => {
          setLookupStep(step);
          if (step !== 'off') {
            setProductStatus('gemini_searching');
          }
        });

        if (chainResult.status === 'found') {
          if (chainResult.source === 'openfoodfacts' && chainResult.product) {
            setCurrentProduct(chainResult.product);
            setGeminiResult(null);
            setProductStatus('found');
            const updated = recordScanInHistory({
              barcode: cleanCode,
              source: 'openfoodfacts',
              productName: chainResult.product.productName,
              brand: chainResult.product.brands,
              imageUrl: chainResult.product.imageUrl,
              product: chainResult.product,
            });
            setHistory(updated);
          } else if (chainResult.geminiResult) {
            setCurrentProduct(null);
            setGeminiResult(chainResult.geminiResult);
            setProductStatus('gemini_found');
            const updated = recordScanInHistory({
              barcode: cleanCode,
              source: (chainResult.source as any) || 'upcitemdb',
              productName: chainResult.geminiResult.productName || 'Product Result',
              brand: chainResult.geminiResult.brand,
              imageUrl: chainResult.geminiResult.imageUrl,
              geminiResult: chainResult.geminiResult,
            });
            setHistory(updated);
          }
        } else if (chainResult.status === 'network_error') {
          setCurrentProduct(null);
          setGeminiResult(null);
          setNetworkError("Couldn't reach the lookup service, check your connection and retry");
          setProductStatus('network_error');
        } else {
          // status === 'not_found'
          setCurrentProduct(null);
          setGeminiResult(null);
          setProductStatus('gemini_not_found');
          const updated = recordScanInHistory({
            barcode: cleanCode,
            source: 'not_found',
            productName: 'Product Not Found',
          });
          setHistory(updated);
        }
      } catch (err) {
        console.warn('Unexpected error in lookup chain:', err);
        setCurrentProduct(null);
        setGeminiResult(null);
        setNetworkError("Couldn't reach the lookup service, check your connection and retry");
        setProductStatus('network_error');
      }
    },
    [soundEnabled, vibrateEnabled, history, secondaryScanTargetBarcode, currentProduct, geminiResult]
  );

  // Reset to scanner
  const handleScanAnother = () => {
    setSecondaryScanTargetBarcode(null);
    setActiveBarcode(null);
    setCurrentProduct(null);
    setGeminiResult(null);
    setProductStatus('idle');
    setNetworkError(null);
    setActiveTab('camera');
  };

  // Launch camera in secondary mode to capture GS1 batch/expiry code
  const handleStartSecondaryScan = useCallback((targetBarcode: string) => {
    setSecondaryScanTargetBarcode(targetBarcode);
    setProductStatus('idle');
    setActiveTab('camera');
  }, []);

  // Retry fetching
  const handleRetryFetch = () => {
    if (activeBarcode) {
      handleBarcodeDetected(activeBarcode, 'standard', 'manual');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center selection:bg-emerald-500 selection:text-white pb-24">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <OfflineBanner
          onOpenHistory={() => setActiveNav('history')}
          cachedItemsCount={history.length}
        />
      )}

      {/* Visual Scan Confirmation Modal */}
      {confirmedBarcode && <ScanConfirmation barcode={confirmedBarcode} />}

      {/* Production App Shell Header */}
      <header className="w-full max-w-md px-4 pt-3.5 pb-3 flex items-center justify-between border-b border-zinc-900 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-zinc-950 shadow-md shadow-emerald-500/20">
            <Scan className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                Barcode Scanner
              </h1>
              {/* Online / Offline Status Indicator */}
              <div
                className={`flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold border ${
                  isOnline
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">
              Food & Product Intelligence
            </span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* In-app Install Prompt button if available */}
          {isInstallable && (
            <button
              onClick={install}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Install Barcode Scanner app"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Audio Beep Toggle */}
          <button
            id="toggle-sound-btn"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800'
                : 'bg-zinc-900/50 border-zinc-900 text-zinc-600 hover:text-zinc-400'
            }`}
            title={soundEnabled ? 'Beep sound enabled' : 'Beep sound muted'}
            aria-label="Toggle beep sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Haptic Vibration Toggle */}
          <button
            id="toggle-vibrate-btn"
            onClick={() => setVibrateEnabled((prev) => !prev)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              vibrateEnabled
                ? 'bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800'
                : 'bg-zinc-900/50 border-zinc-900 text-zinc-600 hover:text-zinc-400'
            }`}
            title={vibrateEnabled ? 'Haptic feedback enabled' : 'Haptic feedback muted'}
            aria-label="Toggle haptic vibration"
          >
            <Vibrate className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Viewport Content Router */}
      <main className="w-full max-w-md px-4 py-4 flex flex-col items-center gap-5">
        {/* TAB 1: SCAN VIEW */}
        {activeNav === 'scan' && (
          <>
            {/* State 1: In-flight Loading Skeleton */}
            {productStatus === 'loading' && activeBarcode && (
              <ProductSkeleton barcode={activeBarcode} />
            )}

            {/* State 2: Multi-step Sequential Product Lookup In-flight Skeleton */}
            {productStatus === 'gemini_searching' && activeBarcode && (
              <GeminiSearchingSkeleton barcode={activeBarcode} step={lookupStep} />
            )}

            {/* State 3: Product Successfully Found (Open Food Facts) */}
            {productStatus === 'found' && currentProduct && (
              <ProductDetailView
                product={currentProduct}
                onScanAnother={handleScanAnother}
                onScanSecondaryCode={() => handleStartSecondaryScan(currentProduct.code)}
                userProfile={userProfile}
                isFavorite={isCurrentProductFavorited}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* State 4: Product Found via UPCItemDB / Gemini / Photo ID */}
            {productStatus === 'gemini_found' && geminiResult && (
              <GeminiProductView
                result={geminiResult}
                onScanAnother={handleScanAnother}
                onScanSecondaryCode={() => handleStartSecondaryScan(geminiResult.barcode)}
                userProfile={userProfile}
                isFavorite={isCurrentProductFavorited}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* State 5: Product Not Found across all services */}
            {productStatus === 'gemini_not_found' && activeBarcode && (
              <GeminiNotFound
                barcode={activeBarcode}
                onScanAnother={handleScanAnother}
                onTryPhoto={() => setIsPhotoModalOpen(true)}
                onManualEntry={() => {
                  setActiveTab('manual');
                  setProductStatus('idle');
                }}
              />
            )}

            {/* State 6: Network Error / Offline lookup failure */}
            {productStatus === 'network_error' && (
              <NetworkErrorState
                errorMessage={networkError || 'Network request failed. Could not reach servers.'}
                barcode={activeBarcode || ''}
                onRetry={handleRetryFetch}
                onScanAnother={handleScanAnother}
              />
            )}

            {/* State 7: Active Scanner (Camera or Manual input) */}
            {productStatus === 'idle' && (
              <div className="w-full flex flex-col items-center gap-4">
                {/* Secondary Scan Notice Banner if scanning for batch/expiry */}
                {secondaryScanTargetBarcode && (
                  <div className="w-full p-3.5 rounded-2xl bg-purple-950/70 border border-purple-800/80 text-purple-200 flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <QrCode className="w-5 h-5 text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          Scan Batch / Expiry Code
                        </p>
                        <p className="text-[11px] text-purple-300/80 leading-tight">
                          Point at GS1-128 or Data Matrix near primary barcode
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSecondaryScanTargetBarcode(null);
                        if (currentProduct) setProductStatus('found');
                        else if (geminiResult) setProductStatus('gemini_found');
                      }}
                      className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-900 text-purple-200 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Cancel secondary scan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Mode Selector Pill */}
                <div className="flex bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800 w-full max-w-sm shadow-inner">
                  <button
                    onClick={() => setActiveTab('camera')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'camera'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Scan className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Barcode</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'manual'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Manual</span>
                  </button>
                  <button
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-amber-300/90 hover:text-amber-200 hover:bg-amber-950/40 transition-all cursor-pointer"
                    title="Identify product from package photo"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Photo ID</span>
                  </button>
                </div>

                {/* Camera Viewport or Manual Form */}
                {activeTab === 'camera' ? (
                  <CameraScanner
                    onBarcodeDetected={handleBarcodeDetected}
                    onSelectManual={() => setActiveTab('manual')}
                    onSelectPhotoId={() => setIsPhotoModalOpen(true)}
                    soundEnabled={soundEnabled}
                    vibrateEnabled={vibrateEnabled}
                  />
                ) : (
                  <ManualEntryForm onSubmitBarcode={(code) => handleBarcodeDetected(code, 'manual', 'manual')} />
                )}

                {/* Recent Scans Quick Preview Drawer on Main Screen */}
                {history.length > 0 && (
                  <div className="w-full mt-2 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-white">Recent Scans</h3>
                      </div>
                      <button
                        onClick={() => setActiveNav('history')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                      >
                        View All ({history.length})
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {history.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleReopenHistoryItem(item)}
                          className="p-2.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/80 border border-zinc-800/60 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden text-[10px]">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Scan className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">
                                {item.productName}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {item.barcode}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-semibold text-emerald-400 shrink-0">
                            Reopen →
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 2: HISTORY VIEW */}
        {activeNav === 'history' && (
          <HistoryView
            history={history}
            onSelectScan={handleReopenHistoryItem}
            onToggleFavorite={handleToggleFavorite}
            onDeleteEntry={handleDeleteHistoryEntry}
            onClearAll={handleClearAllHistory}
            onSwitchToScan={() => {
              setActiveNav('scan');
              handleScanAnother();
            }}
          />
        )}

        {/* TAB 3: SETTINGS VIEW */}
        {activeNav === 'settings' && (
          <SettingsView
            userProfile={userProfile}
            onSaveProfile={handleSaveProfile}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((prev) => !prev)}
            vibrateEnabled={vibrateEnabled}
            onToggleVibrate={() => setVibrateEnabled((prev) => !prev)}
            historyCount={history.length}
            onClearHistory={handleClearAllHistory}
          />
        )}
        {/* Batch / Expiry secondary scan success toast */}
        {batchScanSuccessToast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] p-3 rounded-xl bg-zinc-900 border border-emerald-500/40 text-white shadow-xl shadow-black/80 flex items-center gap-2.5 animate-in slide-in-from-bottom-2 fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-medium">{batchScanSuccessToast}</span>
          </div>
        )}

        {/* Photo Visual Identification Modal */}
        <PhotoIdentifyModal
          isOpen={isPhotoModalOpen}
          barcode={activeBarcode || undefined}
          onClose={() => setIsPhotoModalOpen(false)}
          onIdentified={(identifiedProduct) => {
            setIsPhotoModalOpen(false);
            setCurrentProduct(null);
            setGeminiResult(identifiedProduct);
            setActiveBarcode(identifiedProduct.barcode || 'PHOTO_ID');
            setProductStatus('gemini_found');
            const updated = recordScanInHistory({
              barcode: identifiedProduct.barcode || 'PHOTO_ID',
              source: 'photo_identification',
              productName: identifiedProduct.productName || 'Visual Photo Identification',
              brand: identifiedProduct.brand,
              imageUrl: identifiedProduct.imageUrl,
              geminiResult: identifiedProduct,
            });
            setHistory(updated);
          }}
        />
      </main>

      {/* Production App Shell Bottom Navigation */}
      <BottomNav
        activeTab={activeNav}
        onChangeTab={(tab) => {
          setActiveNav(tab);
          if (tab === 'scan' && productStatus !== 'idle') {
            // keep current product view or resume scanner
          }
        }}
        historyCount={history.length}
        activeRestrictionsCount={activeRestrictionsCount}
      />
    </div>
  );
}
