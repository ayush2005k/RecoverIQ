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
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E6E2D8] text-[11px] font-mono uppercase tracking-wider text-stone-500">
          <span className="font-semibold text-stone-800">Executive Summary & Capital At Risk</span>
          <span>Cycle: Aug – Sep 2026</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Revenue At Risk */}
          <MetricCard
            title="Revenue At Risk"
            amount={summary.revenueAtRisk}
            icon={<AlertOctagon className="w-4 h-4 text-amber-600" />}
            subValue={`${summary.activeCasesCount.toLocaleString('en-IN')} active declines`}
            badgeText="AT RISK"
            badgeVariant="warning"
            highlightVariant="amber"
            tooltip="Total gross volume of failed and at-risk payments"
          />

          {/* Predicted Recoverable */}
          <MetricCard
            title="Predicted Recoverable"
            amount={summary.predictedRecoverableRevenue}
            icon={<Sparkles className="w-4 h-4 text-indigo-700" />}
            subValue="75.0% expected value yield"
            badgeText="MAX EV"
            badgeVariant="indigo"
            highlightVariant="indigo"
            tooltip="Theoretical recoverable maximum based on optimal action ranking"
          />

          {/* Revenue Recovered */}
          <MetricCard
            title="Revenue Recovered"
            amount={summary.revenueRecovered}
            icon={<TrendingUp className="w-4 h-4 text-emerald-700" />}
            subValue={`${summary.totalCasesProcessed.toLocaleString('en-IN')} cases resolved`}
            badgeText="REALIZED"
            badgeVariant="success"
            highlightVariant="emerald"
            tooltip="Actual revenue successfully recovered via AI interventions"
          />

          {/* Incremental Lift */}
          <MetricCard
            title="Incremental Lift"
            amount={summary.incrementalRevenue}
            icon={<ArrowUpRight className="w-4 h-4 text-emerald-700" />}
            subValue={`+${summary.incrementalPercentage}% vs static retry`}
            badgeText={`+${summary.incrementalPercentage}%`}
            badgeVariant="gold"
            highlightVariant="gold"
            tooltip="Additional revenue recovered above standard 3-day naive retry baseline"
          />

          {/* Recovery Rate */}
          <MetricCard
            title="Recovery Rate"
            formattedValue={formatPercent(summary.recoveryRate)}
            icon={<Percent className="w-4 h-4 text-stone-700" />}
            subValue={`vs ${formatPercent(summary.baselineRecoveryRate)} baseline`}
            badgeText={`+${((summary.recoveryRate - summary.baselineRecoveryRate) * 100).toFixed(1)}%`}
            badgeVariant="neutral"
            highlightVariant="slate"
            tooltip="Current recovery conversion percentage compared to baseline"
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
