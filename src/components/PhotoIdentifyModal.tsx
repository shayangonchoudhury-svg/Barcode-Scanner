import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, AlertTriangle, Upload, Sparkles, Terminal } from 'lucide-react';
import { GeminiProductResult } from '../types';
import { handleVisualIdentification, VisualIdentificationError } from '../utils/scanner';

interface PhotoIdentifyModalProps {
  isOpen: boolean;
  barcode?: string;
  onClose: () => void;
  onIdentified: (result: GeminiProductResult) => void;
}

interface PhotoIdentificationErrorState {
  status?: number;
  endpoint?: string;
  responseBody?: string;
  message: string;
}

export const PhotoIdentifyModal: React.FC<PhotoIdentifyModalProps> = ({
  isOpen,
  barcode,
  onClose,
  onIdentified,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<PhotoIdentificationErrorState | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setErrorDetails(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  async function startCamera() {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access for photo mode failed:', err);
      setCameraError('Could not open camera stream. You can still upload a photo directly.');
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function captureSnapshot() {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImage(base64Data);
    stopCamera();
    sendPhotoForIdentification(base64Data);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) {
        setCapturedImage(base64);
        stopCamera();
        sendPhotoForIdentification(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  async function sendPhotoForIdentification(imageBase64: string) {
    setIsAnalyzing(true);
    setErrorDetails(null);

    try {
      const data = await handleVisualIdentification(imageBase64, barcode);

      if (data.found && (data.productName || data.brand)) {
        const result: GeminiProductResult = {
          barcode: barcode || data.barcode || 'PHOTO_ID',
          found: true,
          rawText: data.rawText || '',
          brand: data.brand,
          productName: data.productName,
          category: data.category,
          description: data.description,
          imageUrl: imageBase64,
          source: 'photo_identification',
          foundViaLabel: data.foundViaLabel || 'Identified from photo — verify details independently',
          confidence: data.confidence,
          isPhotoId: true,
          manufacturer: data.manufacturer,
          sources: [],
        };

        onIdentified(result);
        onClose();
      } else {
        setErrorDetails({
          message:
            'Could not identify this product from the photo with reasonable confidence. Please try taking a clearer photo showing the front brand name and label.',
        });
      }
    } catch (err: any) {
      console.error('Photo visual identification failed with details:', {
        httpStatus: err.httpStatus || err.status,
        endpoint: err.endpointUrl || err.endpoint,
        rawResponseBody: err.rawResponseText || err.responseBody,
        message: err.message,
      });

      if (err instanceof VisualIdentificationError) {
        setErrorDetails({
          status: err.httpStatus,
          endpoint: err.endpointUrl,
          responseBody: err.rawResponseText,
          message: err.message,
        });
      } else {
        setErrorDetails({
          status: err.status || err.httpStatus,
          endpoint: err.endpoint || err.endpointUrl || '/api/barcode/photo-identify',
          responseBody: err.rawResponseText || err.responseBody || err.toString(),
          message: err.message || 'Failed to analyze photo. Check your network connection.',
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleRetake() {
    setCapturedImage(null);
    setErrorDetails(null);
    startCamera();
  }

  if (!isOpen) return null;

  return (
    <div
      id="photo-identify-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Visual Identification</h3>
              <p className="text-[11px] text-zinc-400">Multimodal photo fallback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advisory banner */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Point at the product label, brand logo, or front packaging text.</span>
        </div>

        {/* Scrollable middle container */}
        <div className="overflow-y-auto flex-1">
          {/* Viewport Area */}
          <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured product snapshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Hidden Canvas for snapshot extraction */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelected}
            />

            {/* Analysis Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
                <p className="text-sm font-bold text-white mb-1">Analyzing packaging with Gemini Vision...</p>
                <p className="text-xs text-zinc-400">Reading text, brand logos, and product packaging</p>
              </div>
            )}

            {/* Camera Error State */}
            {cameraError && !capturedImage && (
              <div className="absolute inset-0 bg-zinc-950 p-6 flex flex-col items-center justify-center text-center">
                <Camera className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-300 mb-3">{cameraError}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Select Photo from Library
                </button>
              </div>
            )}
          </div>

          {/* Diagnostic Error Notification */}
          {errorDetails && (
            <div className="p-3.5 mx-4 mt-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Photo Identification Error</span>
                </div>
                {errorDetails.status ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 font-mono text-[11px] font-bold border border-rose-500/40">
                    HTTP {errorDetails.status}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                    Connection / Local
                  </span>
                )}
              </div>

              <p className="text-rose-200 font-medium">{errorDetails.message}</p>

              {errorDetails.endpoint && (
                <div className="text-[11px] text-zinc-400 font-mono bg-black/40 px-2 py-1 rounded-md">
                  <span className="text-zinc-500">Target Endpoint: </span>
                  <span className="text-zinc-300">{errorDetails.endpoint}</span>
                </div>
              )}

              {errorDetails.responseBody && (
                <div className="mt-1 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                    <Terminal className="w-3 h-3 text-zinc-500" />
                    <span>Raw API Response Body:</span>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-zinc-950/90 border border-rose-500/20 text-[11px] text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-36 select-all">
                    {errorDetails.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 flex items-center justify-between gap-3 bg-zinc-950/60 border-t border-zinc-800/80">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                disabled={isAnalyzing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Photo
              </button>
              <button
                onClick={() => sendPhotoForIdentification(capturedImage)}
                disabled={isAnalyzing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                Analyze Again
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-4 h-4 text-zinc-400" />
                Upload
              </button>
              <button
                onClick={captureSnapshot}
                disabled={!cameraActive}
                className="flex-1 py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
              >
                <Camera className="w-4 h-4" />
                Capture & Identify
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
