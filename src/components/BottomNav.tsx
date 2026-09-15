import React from 'react';
import { Scan, History, Settings, ShieldAlert } from 'lucide-react';

export type NavTab = 'scan' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  historyCount: number;
  activeRestrictionsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  historyCount,
  activeRestrictionsCount,
}) => {
  return (
    <nav
      id="bottom-app-navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/92 backdrop-blur-lg border-t border-zinc-900 px-6 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-around max-w-md mx-auto"
      aria-label="App Navigation"
    >
      {/* Tab 1: Scan */}
      <button
        id="nav-tab-scan"
        onClick={() => onChangeTab('scan')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer relative ${
          activeTab === 'scan'
            ? 'text-emerald-400 font-bold'
            : 'text-zinc-500 hover:text-zinc-300 font-medium'
        }`}
      >
        <div className={`p-1 rounded-lg ${activeTab === 'scan' ? 'bg-emerald-500/15' : ''}`}>
          <Scan className="w-5 h-5" />
        </div>
        <span className="text-[11px] tracking-tight">Scan</span>
        {activeTab === 'scan' && (
          <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>

      {/* Tab 2: History */}
      <button
        id="nav-tab-history"
        onClick={() => onChangeTab('history')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer relative ${
          activeTab === 'history'
            ? 'text-emerald-400 font-bold'
            : 'text-zinc-500 hover:text-zinc-300 font-medium'
        }`}
      >
        <div className={`p-1 rounded-lg relative ${activeTab === 'history' ? 'bg-emerald-500/15' : ''}`}>
          <History className="w-5 h-5" />
          {historyCount > 0 && (
            <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1 rounded-full bg-zinc-800 text-emerald-400 border border-zinc-700 min-w-[16px] text-center">
              {historyCount > 99 ? '99+' : historyCount}
            </span>
          )}
        </div>
        <span className="text-[11px] tracking-tight">History</span>
        {activeTab === 'history' && (
          <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>

      {/* Tab 3: Settings */}
      <button
        id="nav-tab-settings"
        onClick={() => onChangeTab('settings')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer relative ${
          activeTab === 'settings'
            ? 'text-emerald-400 font-bold'
            : 'text-zinc-500 hover:text-zinc-300 font-medium'
        }`}
      >
        <div className={`p-1 rounded-lg relative ${activeTab === 'settings' ? 'bg-emerald-500/15' : ''}`}>
          {activeRestrictionsCount > 0 ? (
            <ShieldAlert className="w-5 h-5 text-red-400" />
          ) : (
            <Settings className="w-5 h-5" />
          )}
          {activeRestrictionsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 text-[9px] font-bold px-1 rounded-full bg-red-600 text-white min-w-[16px] text-center">
              {activeRestrictionsCount}
            </span>
          )}
        </div>
        <span className="text-[11px] tracking-tight">Settings</span>
        {activeTab === 'settings' && (
          <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>
    </nav>
  );
};
