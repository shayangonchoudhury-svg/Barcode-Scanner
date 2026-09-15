import React from 'react';

interface ViewfinderOverlayProps {
  isScanning: boolean;
  engineName: string;
}

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = ({
  isScanning,
  engineName,
}) => {
  return (
    <div
      id="viewfinder-container"
      className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden z-10"
    >
      {/* Viewfinder target box with outside dimming via box-shadow */}
      <div className="relative flex flex-col items-center justify-center">
        <div
          id="scanner-viewfinder"
          className="relative w-72 h-48 sm:w-80 sm:h-52 rounded-2xl transition-all duration-300"
          style={{
            boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.72)',
          }}
        >
          {/* Viewfinder border frame */}
          <div className="absolute inset-0 rounded-2xl border border-emerald-500/25"></div>

          {/* Top-Left Corner Bracket */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-[3.5px] border-l-[3.5px] border-emerald-400 rounded-tl-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

          {/* Top-Right Corner Bracket */}
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-[3.5px] border-r-[3.5px] border-emerald-400 rounded-tr-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

          {/* Bottom-Left Corner Bracket */}
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-[3.5px] border-l-[3.5px] border-emerald-400 rounded-bl-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

          {/* Bottom-Right Corner Bracket */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-[3.5px] border-r-[3.5px] border-emerald-400 rounded-br-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

          {/* Center Target Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-6 h-0.5 bg-emerald-400"></div>
            <div className="h-6 w-0.5 bg-emerald-400 absolute"></div>
          </div>

          {/* Subtle animated scanning laser line */}
          {isScanning && (
            <div className="absolute inset-x-2 overflow-hidden h-full pointer-events-none">
              <div
                id="scanning-laser-line"
                className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_2px_rgba(52,211,153,0.9)] animate-scan-laser"
              />
            </div>
          )}
        </div>

        {/* Framing guidance label below viewfinder */}
        <div className="mt-4 flex flex-col items-center gap-1.5 px-4 text-center">
          <p className="text-xs font-medium tracking-wide text-zinc-300 bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-800 backdrop-blur-sm shadow-md">
            Align barcode or QR code within the frame
          </p>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Active Engine: <strong className="text-zinc-200">{engineName}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
