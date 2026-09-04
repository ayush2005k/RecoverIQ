import React from 'react';
import { EditorialHeader } from './EditorialHeader';

interface LayoutProps {
  children: React.ReactNode;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  activeCasesCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onRunStrategy?: () => void;
  isRunningStrategy?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentTab = 'dashboard',
  onSelectTab = () => {},
  activeCasesCount = 1420,
  onRefresh = () => {},
  isRefreshing = false,
  onRunStrategy,
  isRunningStrategy,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Editorial Swiss Top Masthead Header */}
      <EditorialHeader
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        activeCasesCount={activeCasesCount}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        onRunStrategy={onRunStrategy}
        isRunningStrategy={isRunningStrategy}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Editorial Colophon / Footer */}
      <footer className="border-t border-[#E6E2D8] bg-[#FAF9F5] py-6 px-4 sm:px-8 text-xs font-mono text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-stone-800">RECOVERIQ DECISION REPOSITORY</span>
          <span>•</span>
          <span className="font-serif-editorial italic text-stone-600">Autonomous Expected-Value Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-stone-500">
          <span>LATENCY: 42MS</span>
          <span>•</span>
          <span>ORCHESTRATION: NPCI / VISA / MASTERCARD / RBI COMPLIANT</span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">ALL GUARDRAILS ACTIVE</span>
        </div>
      </footer>
    </div>
  );
};
