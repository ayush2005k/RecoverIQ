import React from 'react';
import { DashboardSummary } from '../../types';
import { formatINR, formatPercent } from '../../utils/formatters';
import { MetricCard } from '../common/MetricCard';
import { BreakdownCharts } from './BreakdownCharts';
import { RecoveryVsBaselineChart } from './RecoveryVsBaselineChart';
import { Sparkles, TrendingUp, Target, ShieldCheck, Scale } from 'lucide-react';

interface StrategyAnalyticsViewProps {
  summary: DashboardSummary;
}

export const StrategyAnalyticsView: React.FC<StrategyAnalyticsViewProps> = ({ summary }) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-[#E6E2D8]">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif-editorial tracking-tight text-stone-900">
          Baseline Benchmark & Lift Attribution
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 font-serif-editorial italic mt-0.5">
          Comparative empirical performance of AI expected-value orchestration vs static naive retry loops
        </p>
      </div>

      {/* Key Benchmark Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="RecoverIQ Recovery Rate"
          formattedValue={formatPercent(summary.recoveryRate)}
          icon={<Sparkles className="w-4 h-4 text-stone-800" />}
          subValue="AI dynamic cadence"
          badgeText="ACTIVE MODEL"
          badgeVariant="indigo"
          highlightVariant="indigo"
        />

        <MetricCard
          title="Naive Baseline Rate"
          formattedValue={formatPercent(summary.baselineRecoveryRate)}
          icon={<Target className="w-4 h-4 text-stone-500" />}
          subValue="3-day static retry"
          badgeText="BASELINE"
          badgeVariant="neutral"
          highlightVariant="slate"
        />

        <MetricCard
          title="Incremental Net Lift"
          formattedValue={`+${summary.incrementalPercentage}%`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-800" />}
          subValue={formatINR(summary.incrementalRevenue) + ' added'}
          badgeText="ALPHA"
          badgeVariant="gold"
          highlightVariant="gold"
        />

        <MetricCard
          title="Policy Compliance"
          formattedValue="100%"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-800" />}
          subValue="0 guardrail violations"
          badgeText="VERIFIED"
          badgeVariant="success"
          highlightVariant="emerald"
        />
      </div>

      {/* Timeseries Lift Curve */}
      <RecoveryVsBaselineChart
        data={summary.timeseries}
        incrementalRevenue={summary.incrementalRevenue}
        incrementalPercentage={summary.incrementalPercentage}
      />

      {/* Failure Reason & Payment Method Breakdown */}
      <BreakdownCharts
        failureBreakdown={summary.failureBreakdown}
        methodBreakdown={summary.methodBreakdown}
      />
    </div>
  );
};
