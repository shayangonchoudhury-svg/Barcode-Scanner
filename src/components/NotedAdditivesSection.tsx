import React from 'react';
import { Info, FlaskConical } from 'lucide-react';
import { NotedAdditive } from '../types';

interface NotedAdditivesSectionProps {
  additives: NotedAdditive[];
}

export const NotedAdditivesSection: React.FC<NotedAdditivesSectionProps> = ({ additives }) => {
  if (!additives || additives.length === 0) return null;

  return (
    <div
      id="noted-additives-section"
      className="bg-zinc-950/90 rounded-2xl p-4 border border-zinc-800 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-sky-400 shrink-0" />
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Noted Ingredients & Additives ({additives.length})
          </h4>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono">Factual Reference</span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Commonly avoided or noted food additives detected in this product:
      </p>

      <div className="space-y-2">
        {additives.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 flex items-start gap-2.5"
          >
            <div className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono text-xs font-bold shrink-0 mt-0.5">
              {item.id}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <span className="font-semibold text-zinc-200">{item.name}</span>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                {item.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
