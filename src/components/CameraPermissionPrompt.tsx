import React from 'react';
import { CameraOff, RefreshCw, Keyboard, ShieldAlert, CheckCircle2, Upload, Sparkles, ExternalLink } from 'lucide-react';

export interface CameraPermissionPromptProps {
  errorType: 'denied' | 'not_found' | 'in_use' | 'unknown';
  errorMessage?: string;
  onRetry: () => void;
  onSelectManual?: () => void;
  onUploadImage?: () => void;
  onSelectPhotoId?: () => void;
}

export const CameraPermissionPrompt: React.FC<CameraPermissionPromptProps> = ({
  errorType,
  errorMessage,
  onRetry,
  onSelectManual,
  onUploadImage,
  onSelectPhotoId,
}) => {
  const isDenied = errorType === 'denied';

  return (
    <div
      id="camera-permission-error"
      className="flex flex-col items-center justify-center p-5 text-center max-w-md mx-auto my-auto z-20"
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-lg shadow-rose-950/40">
        {isDenied ? <ShieldAlert className="w-7 h-7" /> : <CameraOff className="w-7 h-7" />}
      </div>

      <h2 className="text-lg font-bold text-zinc-100 mb-1.5">
        {isDenied ? 'Camera Access Denied' : 'Camera Unavailable'}
      </h2>

      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
        {isDenied
          ? 'Camera permission was not granted by your browser. You can allow access in your browser settings, upload a barcode photo, or enter the code manually.'
          : errorMessage || 'Could not connect to a video camera device. Ensure no other application is using it.'}
      </p>

      {/* Instructions list */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 mb-4 text-left shadow-inner">
        <p className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          How to enable camera:
        </p>
        <ul className="text-xs text-zinc-400 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="font-semibold text-zinc-300">1.</span>
            <span>Tap the lock or site settings icon in the browser address bar.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-zinc-300">2.</span>
            <span>Set <strong>Camera</strong> to <strong>Allow</strong>, then tap <strong>Try Again</strong>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-zinc-300">3.</span>
            <span>In an embedded preview, opening the app in a new tab or window grants direct camera permission.</span>
          </li>
        </ul>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col sm:flex-row w-full gap-2 mb-2">
        <button
          id="btn-retry-camera"
          onClick={onRetry}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-950/40 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>

        {onUploadImage && (
          <button
            id="btn-upload-barcode-image"
            onClick={onUploadImage}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-700 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Upload Photo
          </button>
        )}
      </div>

      {/* Secondary Fallback Options */}
      <div className="flex flex-col sm:flex-row w-full gap-2">
        {onSelectManual && (
          <button
            id="btn-switch-manual-fallback"
            onClick={onSelectManual}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-zinc-800 cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
            Enter Barcode Manually
          </button>
        )}

        {onSelectPhotoId && (
          <button
            id="btn-switch-photo-id-fallback"
            onClick={onSelectPhotoId}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs font-medium transition-colors border border-amber-800/40 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Photo ID Fallback
          </button>
        )}
      </div>
    </div>
  );
};

