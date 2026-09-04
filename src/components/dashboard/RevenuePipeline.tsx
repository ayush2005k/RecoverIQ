import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, TrendingUp, DollarSign, Layers } from 'lucide-react';
import { formatINR, formatPercent } from '../../utils/formatters';

interface RevenuePipelineProps {
  revenueAtRisk: number;
  predictedRecoverableRevenue: number;
  revenueRecovered: number;
  incrementalRevenue: number;
  recoveryRate: number;
  baselineRecoveryRate: number;
}

export const RevenuePipeline: React.FC<RevenuePipelineProps> = ({
  revenueAtRisk,
  predictedRecoverableRevenue,
  revenueRecovered,
  incrementalRevenue,
  recoveryRate,
  baselineRecoveryRate,
}) => {
  return (
    <div className="bg-white border border-[#E6E2D8] p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#F0ECE1]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-stone-700" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-800">
            End-to-End Decision Flow Ledger
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
          <span className="px-2 py-0.5 border border-[#E6E2D8] bg-[#FAF9F5] text-stone-700 font-semibold">
            EV OPTIMIZATION ACTIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* Step 1: Revenue at Risk */}
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] border-t-2 border-t-amber-600 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-amber-900 uppercase tracking-wider">
                1. REVENUE AT RISK
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 tracking-tight">
              {formatINR(revenueAtRisk, { compact: true })}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Failed & at-risk transaction pool (6,840 cases)
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E6E2D8] text-[11px] font-mono text-stone-500 flex items-center justify-between">
            <span>Naive Baseline Rate:</span>
            <span className="text-stone-800 font-semibold">{formatPercent(baselineRecoveryRate)}</span>
          </div>
        </div>

        {/* Step 2: ML Scoring & Guardrails */}
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] border-t-2 border-t-indigo-700 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-indigo-950 uppercase tracking-wider">
                2. ML SCORING & GUARDRAILS
              </span>
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-950 tracking-tight">
              {formatINR(predictedRecoverableRevenue, { compact: true })}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Predicted recoverable EV ({formatPercent(predictedRecoverableRevenue / revenueAtRisk)} yield)
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E6E2D8] text-[11px] font-mono text-stone-600 flex items-center justify-between">
            <span>Candidate Evaluator:</span>
            <span className="font-semibold text-indigo-900">7 Strategies Ranked</span>
          </div>
        </div>

        {/* Step 3: Revenue Recovered */}
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] border-t-2 border-t-emerald-700 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-emerald-900 uppercase tracking-wider">
                3. REVENUE RECOVERED
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-900 tracking-tight">
              {formatINR(revenueRecovered, { compact: true })}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Realized capture ({formatPercent(recoveryRate)} with RecoverIQ)
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E6E2D8] text-[11px] font-mono text-emerald-800 flex items-center justify-between">
            <span>Net Incremental Gain:</span>
            <span className="font-bold bg-emerald-100 text-emerald-950 px-1.5 py-0.5 border border-emerald-300">
              +{formatINR(incrementalRevenue, { compact: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
