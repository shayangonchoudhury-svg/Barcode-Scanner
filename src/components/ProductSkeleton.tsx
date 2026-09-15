import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProductSkeletonProps {
  barcode: string;
}

export const ProductSkeleton: React.FC<ProductSkeletonProps> = ({ barcode }) => {
  return (
    <div
      id="product-loading-skeleton"
      className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-pulse"
    >
      {/* Top progress bar animation */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 animate-pulse" />

      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-zinc-800/80">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-zinc-300">
            Querying Open Food Facts database...
          </p>
          <p className="text-[11px] font-mono text-zinc-500">
            Barcode: {barcode}
          </p>
        </div>
      </div>

      {/* Product Image & Main Title Skeleton */}
      <div className="flex gap-4 mb-5">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-5 bg-zinc-800 rounded-md w-3/4" />
          <div className="h-3.5 bg-zinc-800/80 rounded-md w-1/2" />
          <div className="h-3 bg-zinc-800/60 rounded-md w-1/3" />
        </div>
      </div>

      {/* Badges Skeleton */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="h-16 bg-zinc-800/70 rounded-xl" />
        <div className="h-16 bg-zinc-800/70 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="space-y-2 mb-5">
        <div className="h-4 bg-zinc-800/80 rounded w-1/3 mb-2" />
        <div className="h-8 bg-zinc-800/50 rounded-lg" />
        <div className="h-8 bg-zinc-800/50 rounded-lg" />
        <div className="h-8 bg-zinc-800/50 rounded-lg" />
      </div>

      {/* Ingredients Skeleton */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <div className="h-3.5 bg-zinc-800 rounded w-1/4" />
        <div className="h-12 bg-zinc-800/40 rounded-lg" />
      </div>
    </div>
  );
};
