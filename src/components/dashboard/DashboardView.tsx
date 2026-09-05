import React from 'react';
import { DashboardSummary, PaymentRecord, DecisionRecord } from '../../types';
import { MetricCard } from '../common/MetricCard';
import { EditorialHero } from './EditorialHero';
import { RevenuePipeline } from './RevenuePipeline';
import { RecoveryVsBaselineChart } from './RecoveryVsBaselineChart';
import { BreakdownCharts } from './BreakdownCharts';
import { PriorityQueue } from './PriorityQueue';
import { RecentDecisions } from './RecentDecisions';
import {
  AlertOctagon,
  Sparkles,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { formatPercent, formatINR } from '../../utils/formatters';

interface DashboardViewProps {
  summary: DashboardSummary;
  onSelectPayment?: (payment: PaymentRecord) => void;
  onSelectDecision?: (decision: DecisionRecord) => void;
  onInspectQueue?: () => void;
  onNavigateToDecisions?: () => void;
  onRunStrategy?: () => void;
  isRunningStrategy?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  onSelectPayment,
  onSelectDecision,
  onInspectQueue = () => {},
  onNavigateToDecisions,
  onRunStrategy,
  isRunningStrategy,
}) => {
  return (
    <div className="space-y-8 pb-12">
      {/* 1. Feature Analysis & Editorial Hero Banner (Matches Reference Image) */}
      <EditorialHero
        onRunStrategy={onRunStrategy}
        onInspectQueue={onInspectQueue}
        isRunningStrategy={isRunningStrategy}
      />

      {/* 2. Key Institutional Metrics */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-[#E6E2D8] text-[11px] font-mono uppercase tracking-wider text-stone-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Executive Summary & Capital At Risk</span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold">
              ACME COMMERCE
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="px-1.5 py-0.5 bg-stone-100 text-stone-700 border border-stone-200">
              Cards 1–2: Current Operational Cycle
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
              Cards 3–5: Synthetic Benchmark (N=3,000)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Revenue At Risk */}
          <MetricCard
            title="Revenue At Risk"
            amount={summary.revenueAtRisk}
            icon={<AlertOctagon className="w-4 h-4 text-amber-600" />}
            subValue="Failed payments currently requiring recovery."
            badgeText="AT RISK"
            badgeVariant="warning"
            highlightVariant="amber"
            tooltip="Current Operational Cycle: Unresolved failed payments in active queue"
          />

          {/* Card 2: Estimated Recoverable */}
          <MetricCard
            title="Estimated Recoverable"
            amount={summary.predictedRecoverableRevenue}
            icon={<Sparkles className="w-4 h-4 text-indigo-700" />}
            subValue="Expected value from eligible recovery actions."
            badgeText="ESTIMATED"
            badgeVariant="indigo"
            highlightVariant="indigo"
            tooltip="Current Operational Cycle: Expected recovery value across active cases"
          />

          {/* Card 3: Revenue Recovered */}
          <MetricCard
            title="Revenue Recovered"
            amount={summary.revenueRecovered}
            icon={<TrendingUp className="w-4 h-4 text-emerald-700" />}
            subValue="Revenue successfully recovered · Synthetic benchmark"
            badgeText="REALIZED"
            badgeVariant="success"
            highlightVariant="emerald"
            tooltip="Synthetic Benchmark (N=3,000): Cumulative revenue successfully recovered"
          />

          {/* Card 4: Additional Revenue */}
          <MetricCard
            title="Additional Revenue"
            amount={summary.incrementalRevenue}
            icon={<ArrowUpRight className="w-4 h-4 text-emerald-700" />}
            subValue="Extra revenue vs. fixed-retry baseline · Synthetic benchmark"
            badgeText={`+${summary.incrementalPercentage}% LIFT`}
            badgeVariant="gold"
            highlightVariant="gold"
            tooltip="Synthetic Benchmark (N=3,000): Extra revenue recovered above fixed-retry baseline"
          />

          {/* Card 5: Recovery Rate */}
          <MetricCard
            title="Recovery Rate"
            formattedValue={formatPercent(summary.recoveryRate)}
            icon={<Percent className="w-4 h-4 text-stone-700" />}
            subValue="Share of evaluated payments successfully recovered"
            badgeText={`vs. ${formatPercent(summary.baselineRecoveryRate)} baseline`}
            badgeVariant="neutral"
            highlightVariant="slate"
            tooltip="Synthetic Benchmark (N=3,000): RecoverIQ recovery conversion vs fixed-retry baseline"
          />
        </div>
      </div>

      {/* 3. Decision Pipeline Ledger */}
      <RevenuePipeline
        revenueAtRisk={summary.revenueAtRisk}
        predictedRecoverableRevenue={summary.predictedRecoverableRevenue}
        revenueRecovered={summary.revenueRecovered}
        incrementalRevenue={summary.incrementalRevenue}
        recoveryRate={summary.recoveryRate}
        baselineRecoveryRate={summary.baselineRecoveryRate}
      />

      {/* 4. Comparative Benchmark & Timeseries Lift */}
      <RecoveryVsBaselineChart
        data={summary.timeseries}
        incrementalRevenue={summary.incrementalRevenue}
        incrementalPercentage={summary.incrementalPercentage}
      />

      {/* 5. Categorical Breakdown Matrices */}
      <BreakdownCharts
        failureBreakdown={summary.failureBreakdown}
        methodBreakdown={summary.methodBreakdown}
      />

      {/* 6. High-Priority Recovery Queue */}
      <PriorityQueue
        cases={summary.highPriorityCases}
        onSelectPayment={onSelectPayment}
      />

      {/* 7. Recent Decision Repository */}
      <RecentDecisions
        decisions={summary.recentDecisions}
        onSelectDecision={onSelectDecision}
        onViewAll={onNavigateToDecisions}
      />
    </div>
  );
};
