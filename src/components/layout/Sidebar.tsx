import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  FileCheck2,
  LineChart,
  ShieldCheck,
  Cpu,
  Database,
  Info
} from 'lucide-react';

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  activeCasesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab = 'dashboard',
  onSelectTab,
  activeCasesCount = 1420,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      active: currentTab === 'dashboard',
      badge: undefined,
    },
    {
      id: 'payments',
      label: 'At-Risk Payments',
      icon: AlertTriangle,
      active: currentTab === 'payments',
      badge: activeCasesCount > 0 ? activeCasesCount.toLocaleString('en-IN') : undefined,
      badgeVariant: 'warning' as const,
      disabled: false,
    },
    {
      id: 'decisions',
      label: 'Decisions & Audit',
      icon: FileCheck2,
      active: currentTab === 'decisions',
      badge: 'Audit Log',
      badgeVariant: 'neutral' as const,
      disabled: false,
    },
    {
      id: 'analytics',
      label: 'Strategy Analytics',
      icon: LineChart,
      active: currentTab === 'analytics',
      badge: undefined,
      disabled: false,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      {/* Main Nav Items */}
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 font-mono">
            Control Tower
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = item.active;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab && onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        item.badgeVariant === 'warning'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Engine Guardrails Status */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Policy Guardrails</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Deterministic business rules actively bound AI actions. Max 3 retries / 72h window enforced.
          </p>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>All Guardrails Active</span>
          </div>
        </div>
      </div>

      {/* Synthetic Dataset & System Disclaimer Notice */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/80">
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/30 text-indigo-300">
          <Database className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
          <div className="text-[11px] leading-tight space-y-1">
            <div className="font-semibold text-indigo-200">Synthetic Demo Environment</div>
            <div className="text-slate-400">Operating on 6,840 simulated payment records. No production funds moved.</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span>Model v2.4 (XGBoost)</span>
          </span>
          <span className="text-indigo-400 font-medium">Test Mode</span>
        </div>
      </div>
    </aside>
  );
};
