import React from 'react';
import { Sparkles, RefreshCw, LayoutDashboard, Layers, Scale, ShieldCheck, Activity } from 'lucide-react';

interface EditorialHeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeCasesCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  onRunStrategy?: () => void;
  isRunningStrategy?: boolean;
}

export const EditorialHeader: React.FC<EditorialHeaderProps> = ({
  currentTab,
  onSelectTab,
  activeCasesCount,
  onRefresh,
  isRefreshing,
  onRunStrategy,
  isRunningStrategy,
}) => {
  const tabs = [
    { id: 'dashboard', number: '01', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'payments', number: '02', label: 'AT-RISK PAYMENTS & QUEUE', icon: Layers, badge: activeCasesCount },
    { id: 'analytics', number: '03', label: 'BASELINE BENCHMARK', icon: Scale },
    { id: 'decisions', number: '04', label: 'DECISION & AUDIT HISTORY', icon: ShieldCheck },
  ];

  return (
    <header className="border-b border-[#E6E2D8] bg-[#FAF9F5] sticky top-0 z-30">
      {/* Masthead Bar */}
      <div className="border-b border-[#E6E2D8] px-4 sm:px-8 py-1.5 text-[11px] font-mono tracking-widest uppercase text-stone-500 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-stone-700">
          RECOVERIQ — REVENUE RECOVERY CONTROL TOWER
        </div>
        <div className="hidden md:block italic text-stone-500 tracking-normal font-serif-editorial text-xs">
          ACME COMMERCE • REVENUE RECOVERY ENGINE
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            ENGINE LIVE
          </span>
          <span className="text-stone-400">|</span>
          <span>EST. 2026</span>
        </div>
      </div>

      {/* Main Title & Action Row */}
      <div className="px-4 sm:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-bold font-serif-editorial tracking-tight text-stone-900">
              RecoverIQ
            </h1>
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase text-stone-800 border border-stone-800 rounded-none bg-stone-100">
              REVENUE RECOVERY CONTROL TOWER
            </span>
          </div>
          <p className="text-sm font-serif-editorial italic text-stone-600 mt-1">
            AI-powered recovery decisions with policy-safe guardrails.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={onRunStrategy}
            disabled={isRunningStrategy}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm border border-stone-900 active:scale-[0.98]"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isRunningStrategy ? 'animate-spin' : ''}`} />
            <span>{isRunningStrategy ? 'Evaluating recovery strategy...' : 'Run AI Strategy'}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 border border-stone-800 bg-white hover:bg-stone-50 text-stone-800 transition-colors"
            title="Refresh Ledger Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Nav Tabs Bar */}
      <div className="px-4 sm:px-8 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono tracking-wider transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'bg-stone-900 text-stone-50 border-stone-900 font-bold shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 border-transparent font-medium'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.number}. {tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-none text-[10px] font-mono ${
                    isActive ? 'bg-amber-400 text-stone-950 font-bold' : 'bg-stone-200 text-stone-700 font-semibold'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
