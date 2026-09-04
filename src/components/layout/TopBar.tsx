import React from 'react';
import { ShieldCheck, ChevronDown, User, Layers, RefreshCw } from 'lucide-react';

interface TopBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onRefresh, isRefreshing }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-950/50 border border-indigo-400/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">
                Recover<span className="text-indigo-400">IQ</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Test Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              AI Revenue Recovery Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Center/Right Status & Context */}
      <div className="flex items-center gap-4">
        {/* Decision Engine Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] font-medium text-slate-300">
            Decision Engine: <span className="text-emerald-400">Online</span>
          </span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh summary data"
            className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}

        {/* Merchant Selector */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs">
          <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-slate-700">
            RZ
          </div>
          <div className="text-left hidden sm:block">
            <div className="font-semibold text-slate-200 leading-tight">Acme Global Payments</div>
            <div className="text-[10px] font-mono text-slate-400 leading-tight">MID_89324-DEMO</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
