import React from 'react';
import { CameraOff, RefreshCw, Keyboard, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CameraPermissionPromptProps {
  errorType: 'denied' | 'not_found' | 'in_use' | 'unknown';
  errorMessage?: string;
  onRetry: () => void;
  onSelectManual: () => void;
}

export const CameraPermissionPrompt: React.FC<CameraPermissionPromptProps> = ({
  errorType,
  errorMessage,
  onRetry,
  onSelectManual,
}) => {
  const isDenied = errorType === 'denied';

  return (
    <div
      id="camera-permission-error"
      className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto z-20"
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-5 text-rose-400 shadow-lg shadow-rose-950/40">
        {isDenied ? <ShieldAlert className="w-8 h-8" /> : <CameraOff className="w-8 h-8" />}
      </div>

      <h2 className="text-xl font-bold text-zinc-100 mb-2">
        {isDenied ? 'Camera Access Denied' : 'Camera Unavailable'}
      </h2>

      <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
        {isDenied
          ? 'Permission to access the camera was declined. The scanner requires your camera to detect barcodes in real-time.'
          : errorMessage || 'Could not connect to a video camera device. Ensure no other application is using it.'}
      </p>

      {/* Instructions list */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 mb-6 text-left shadow-inner">
        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          How to grant access:
        </p>
        <ul className="text-xs text-zinc-400 space-y-2">
          <li className="flex items-start gap-2">
            <span className="font-semibold text-zinc-300">1.</span>
            <span>Tap the lock or tune icon in the browser address bar at the top.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-zinc-300">2.</span>
            <span>Toggle <strong>Camera</strong> permissions to <strong>Allow</strong>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-zinc-300">3.</span>
            <span>If on iOS Safari, go to <em>Settings &gt; Safari &gt; Camera &gt; Allow</em>.</span>
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row w-full gap-3">
        <button
          id="btn-retry-camera"
          onClick={onRetry}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-950/50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>

        <button
          id="btn-switch-manual-fallback"
          onClick={onSelectManual}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition-colors border border-zinc-700 cursor-pointer"
        >
          <Keyboard className="w-4 h-4" />
          Enter Code Manually
        </button>
      </div>
    </div>
  );
};
