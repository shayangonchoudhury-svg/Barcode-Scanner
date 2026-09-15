import React from 'react';
import { Building2, MapPin, Globe, Store, ShieldCheck } from 'lucide-react';
import { ManufacturerInfo } from '../types';

interface ManufacturerSectionProps {
  manufacturer?: ManufacturerInfo;
}

export const ManufacturerSection: React.FC<ManufacturerSectionProps> = ({
  manufacturer,
}) => {
  const company = manufacturer?.companyName;
  const location = manufacturer?.manufacturingPlaces;
  const origin = manufacturer?.origins || manufacturer?.countries;
  const stores = manufacturer?.stores;
  const isWebSourced = manufacturer?.source === 'gemini_web';

  const hasData = Boolean(company || location || origin || stores);

  return (
    <div
      id="section-manufacturer-details"
      className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Manufacturer
          </h4>
        </div>
        {hasData && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isWebSourced
                ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isWebSourced ? 'Web Sourced' : 'Verified Database'}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="py-2 text-xs text-zinc-400 bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/80">
          <p className="font-medium text-zinc-300">
            Manufacturer details not available for this product
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Neither company name, manufacturing plant, nor country of origin was declared in packaging metadata.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          {/* Company Name */}
          <div className="flex items-start gap-2.5">
            <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-zinc-500 block uppercase tracking-wider font-semibold">
                Company Name
              </span>
              <p className="text-zinc-200 font-medium break-words">
                {company || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Manufacturing Location */}
          <div className="flex items-start gap-2.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-zinc-500 block uppercase tracking-wider font-semibold">
                Manufacturing Location
              </span>
              <p className="text-zinc-200 font-medium break-words">
                {location || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Country of Origin */}
          <div className="flex items-start gap-2.5">
            <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-zinc-500 block uppercase tracking-wider font-semibold">
                Country of Origin
              </span>
              <p className="text-zinc-200 font-medium break-words">
                {origin || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Known retail stores if declared in database */}
          {stores && (
            <div className="flex items-start gap-2.5 pt-1 border-t border-zinc-900">
              <Store className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-zinc-500 block uppercase tracking-wider font-semibold">
                  Known Retail Stores
                </span>
                <p className="text-zinc-300 font-normal break-words">{stores}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
