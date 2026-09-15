import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  detectNativeBarcodeSupport,
  playBeepSound,
  triggerHaptic,
} from '../utils/scanner';
import { ViewfinderOverlay } from './ViewfinderOverlay';
import { CameraPermissionPrompt } from './CameraPermissionPrompt';
import { ScannerStatus } from '../types';
import { Flashlight, FlashlightOff, SwitchCamera, Loader2 } from 'lucide-react';

interface CameraScannerProps {
  onDetected?: (code: string, format: string, source: 'native' | 'html5-qrcode') => void;
  onBarcodeDetected?: (code: string, format: string, source: 'native' | 'html5-qrcode') => void;
  onSelectManual?: () => void;
  onSelectPhotoId?: () => void;
  soundEnabled?: boolean;
  vibrateEnabled?: boolean;
}

export function parseCameraError(err: unknown): {
  type: 'denied' | 'not_found' | 'in_use' | 'unknown';
  message: string;
} {
  const errStr =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? `${err.name}: ${err.message}`
      : String(err);
  const lower = errStr.toLowerCase();

  const isDenied =
    lower.includes('notallowederror') ||
    lower.includes('permission denied') ||
    lower.includes('permission_denied') ||
    lower.includes('permissiondeniederror') ||
    (err as any)?.name === 'NotAllowedError' ||
    (err as any)?.name === 'PermissionDeniedError';

  if (isDenied) {
    return {
      type: 'denied',
      message: 'Camera permission was denied or not yet granted. Please allow camera access in your browser or enter the code manually.',
    };
  }

  const isNotFound =
    lower.includes('notfounderror') ||
    lower.includes('devicesnotfounderror') ||
    lower.includes('no camera') ||
    lower.includes('no video') ||
    (err as any)?.name === 'NotFoundError' ||
    (err as any)?.name === 'DevicesNotFoundError';

  if (isNotFound) {
    return {
      type: 'not_found',
      message: 'No camera device found on this device or system.',
    };
  }

  const isInUse =
    lower.includes('notreadableerror') ||
    lower.includes('trackstarterror') ||
    lower.includes('in use') ||
    (err as any)?.name === 'NotReadableError' ||
    (err as any)?.name === 'TrackStartError';

  if (isInUse) {
    return {
      type: 'in_use',
      message: 'Camera is currently in use by another tab or app.',
    };
  }

  return {
    type: 'unknown',
    message: (err as any)?.message || errStr || 'Unable to access the camera.',
  };
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onDetected,
  onBarcodeDetected,
  onSelectManual,
  onSelectPhotoId,
  soundEnabled = true,
  vibrateEnabled = true,
}) => {
  const [status, setStatus] = useState<ScannerStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<'denied' | 'not_found' | 'in_use' | 'unknown'>('unknown');
  const [activeEngine, setActiveEngine] = useState<'native' | 'html5-qrcode'>('native');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  // Stop any active camera streams and decoding loops
  const stopAll = useCallback(async () => {
    isScanningRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error clearing html5QrCode:', err);
      }
      html5QrCodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Handler for successful detection
  const handleSuccess = useCallback(
    async (code: string, format: string, source: 'native' | 'html5-qrcode') => {
      if (isStoppingRef.current || !isScanningRef.current) return;
      isStoppingRef.current = true;
      isScanningRef.current = false;

      // 1. Audio & Vibration feedback
      if (vibrateEnabled) triggerHaptic();
      if (soundEnabled) playBeepSound();

      // 2. Stop camera stream immediately
      await stopAll();

      // 3. Inform parent component
      const cb = onDetected || onBarcodeDetected;
      if (cb) cb(code, format, source);
      isStoppingRef.current = false;
    },
    [onDetected, onBarcodeDetected, soundEnabled, vibrateEnabled, stopAll]
  );

  // Initialize Native BarcodeDetector
  const startNativeScanner = useCallback(
    async (supportedFormats: string[]) => {
      try {
        // Feature detect BarcodeDetector
        const BarcodeDetectorClass = (window as unknown as {
          BarcodeDetector: new (options?: { formats: string[] }) => {
            detect: (image: HTMLVideoElement) => Promise<Array<{ rawValue: string; format: string }>>;
          };
        }).BarcodeDetector;

        const detector = new BarcodeDetectorClass({
          formats: supportedFormats,
        });

        // Request camera with preference for rear camera (facingMode: environment)
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const capabilities = videoTrack.getCapabilities() as { torch?: boolean };
            if (capabilities && 'torch' in capabilities && capabilities.torch) {
              setHasTorch(true);
            }
          } catch {
            // getCapabilities might not be supported in some browsers
          }
        }

        if (!videoRef.current) {
          throw new Error('Video element ref not ready');
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        isScanningRef.current = true;
        setStatus('scanning');

        // Continuous detection frame loop
        let isDetecting = false;
        const scanLoop = async () => {
          if (!isScanningRef.current) return;

          if (
            videoRef.current &&
            videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            !isDetecting
          ) {
            isDetecting = true;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detected = barcodes[0];
                handleSuccess(detected.rawValue, detected.format, 'native');
                return;
              }
            } catch (err) {
              // Frame dropped or detection glitch, keep scanning
            } finally {
              isDetecting = false;
            }
          }

          if (isScanningRef.current) {
            animationFrameRef.current = requestAnimationFrame(scanLoop);
          }
        };

        animationFrameRef.current = requestAnimationFrame(scanLoop);
      } catch (err: unknown) {
        console.error('Native BarcodeDetector failure:', err);
        throw err;
      }
    },
    [facingMode, handleSuccess]
  );

  // Initialize html5-qrcode Fallback
  const startHtml5QrcodeScanner = useCallback(async () => {
    try {
      // Use Html5Qrcode library (from npm or window.Html5Qrcode)
      const Html5QrcodeClass =
        (typeof Html5Qrcode !== 'undefined' && Html5Qrcode) ||
        (window as unknown as { Html5Qrcode: typeof Html5Qrcode }).Html5Qrcode;

      if (!Html5QrcodeClass) {
        throw new Error('html5-qrcode library is not loaded');
      }

      const containerId = 'html5qr-scanner-mount';
      const scanner = new Html5QrcodeClass(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: facingMode },
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333333,
        },
        (decodedText, decodedResult) => {
          const format = decodedResult?.result?.format?.formatName || 'html5-qrcode';
          handleSuccess(decodedText, format, 'html5-qrcode');
        },
        () => {
          // Frame without code, scanning continues
        }
      );

      isScanningRef.current = true;
      setStatus('scanning');
    } catch (err: unknown) {
      const parsed = parseCameraError(err);
      if (parsed.type === 'denied') {
        console.warn('html5-qrcode camera access was not granted:', err);
      } else {
        console.warn('html5-qrcode initialization notice:', err);
      }
      throw err;
    }
  }, [facingMode, handleSuccess]);

  // Main start routine with feature detection
  const startCamera = useCallback(async () => {
    setStatus('initializing');
    setErrorMessage('');
    await stopAll();

    try {
      // 1. Check native BarcodeDetector API and supported formats
      const nativeSupport = await detectNativeBarcodeSupport();

      if (nativeSupport.supported && nativeSupport.formats.length > 0) {
        setActiveEngine('native');
        await startNativeScanner(nativeSupport.formats);
      } else {
        // 2. Fall back to html5-qrcode
        console.info('Native BarcodeDetector unavailable, falling back to html5-qrcode');
        setActiveEngine('html5-qrcode');
        await startHtml5QrcodeScanner();
      }
    } catch (err: unknown) {
      const parsed = parseCameraError(err);

      if (parsed.type === 'denied') {
        console.warn('Camera access denied or dismissed by user:', parsed.message);
        setErrorType('denied');
        setStatus('permission_denied');
      } else if (parsed.type === 'not_found') {
        console.warn('Camera device not found:', parsed.message);
        setErrorType('not_found');
        setErrorMessage(parsed.message);
        setStatus('error');
      } else if (parsed.type === 'in_use') {
        console.warn('Camera in use by another application:', parsed.message);
        setErrorType('in_use');
        setErrorMessage(parsed.message);
        setStatus('error');
      } else {
        console.warn('Camera initialization could not start video stream:', err);
        setErrorType('unknown');
        setErrorMessage(parsed.message);
        setStatus('error');
      }
    }
  }, [startNativeScanner, startHtml5QrcodeScanner, stopAll]);

  // Mount/unmount lifecycle
  useEffect(() => {
    startCamera();

    return () => {
      stopAll();
    };
  }, [startCamera, stopAll]);

  // Torch / Flashlight toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Switch facing mode (rear vs front)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Decode barcode from image file fallback
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('initializing');
    try {
      const Html5QrcodeClass =
        (typeof Html5Qrcode !== 'undefined' && Html5Qrcode) ||
        (window as unknown as { Html5Qrcode: typeof Html5Qrcode }).Html5Qrcode;

      if (!Html5QrcodeClass) {
        throw new Error('Barcode decoder library not loaded');
      }

      const tempScanner = new Html5QrcodeClass('html5qr-file-scanner-mount', {
        verbose: false,
      });

      const decodedText = await tempScanner.scanFile(file, false);
      await tempScanner.clear();

      handleSuccess(decodedText, 'image-file', 'html5-qrcode');
    } catch (scanErr) {
      console.warn('Barcode decoding from image file failed:', scanErr);
      if (onSelectPhotoId) {
        onSelectPhotoId();
      } else {
        setErrorType('unknown');
        setErrorMessage('Could not find a clear barcode in that image. Try entering the code numbers manually.');
        setStatus('error');
      }
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      id="camera-scanner-viewport"
      className="relative w-full h-[360px] sm:h-[420px] bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex items-center justify-center"
    >
      {/* Hidden file input for barcode image upload fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div id="html5qr-file-scanner-mount" className="hidden" />

      {/* 1. Permission Denied / Error State */}
      {(status === 'permission_denied' || status === 'error') && (
        <CameraPermissionPrompt
          errorType={errorType}
          errorMessage={errorMessage}
          onRetry={startCamera}
          onSelectManual={onSelectManual}
          onUploadImage={handleUploadClick}
          onSelectPhotoId={onSelectPhotoId}
        />
      )}

      {/* 2. Loading State */}
      {status === 'initializing' && (
        <div className="flex flex-col items-center justify-center p-6 text-center z-10">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
          <p className="text-sm font-medium text-zinc-200">Initializing Camera...</p>
          <p className="text-xs text-zinc-400 mt-1">Configuring barcode detector</p>
        </div>
      )}

      {/* 3. Native Video Feed (when native engine is active) */}
      <video
        ref={videoRef}
        id="native-camera-video"
        className={`w-full h-full object-cover ${activeEngine === 'native' && status === 'scanning' ? 'block' : 'hidden'}`}
        playsInline
        muted
        autoPlay
      />

      {/* 4. html5-qrcode mount element (when fallback engine is active) */}
      <div
        id="html5qr-scanner-mount"
        className={`w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${activeEngine === 'html5-qrcode' && status === 'scanning' ? 'block' : 'hidden'}`}
      />

      {/* 5. Viewfinder Overlay (with corner brackets, outside dimming, and laser) */}
      {status === 'scanning' && (
        <ViewfinderOverlay
          isScanning={status === 'scanning'}
          engineName={activeEngine === 'native' ? 'Native BarcodeDetector' : 'html5-qrcode'}
        />
      )}

      {/* 6. In-view Camera Controls (Torch, Flip Camera) */}
      {status === 'scanning' && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {hasTorch && (
            <button
              id="btn-toggle-torch"
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-colors cursor-pointer ${
                torchOn
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:text-white'
              }`}
              title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
            >
              {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
            </button>
          )}

          <button
            id="btn-switch-camera"
            onClick={toggleFacingMode}
            className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white backdrop-blur-md border border-zinc-700 transition-colors cursor-pointer"
            title="Switch Camera (Front/Rear)"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
