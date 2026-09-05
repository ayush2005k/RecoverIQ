import React from 'react';
import { ShieldCheck, TrendingUp, AlertOctagon, Sparkles, Layers, CheckCircle2 } from 'lucide-react';
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
  const canonicalActions = [
    { num: '1', name: 'Retry Now', desc: 'for transient network/gateway glitches' },
    { num: '2', name: 'Retry Later', desc: 'scheduled for optimal recovery window' },
    { num: '3', name: 'Send Payment Link', desc: 'interactive UPI/card payment link via SMS/WhatsApp' },
    { num: '4', name: 'Send Reminder', desc: 'nudge customer before retry or expiration' },
    { num: '5', name: 'Update Payment Method', desc: 'prompt customer to switch UPI/card' },
    { num: '6', name: 'Human Escalation', desc: 'high-value or VIP customer support outreach' },
    { num: '7', name: 'Stop Recovery', desc: 'policy limits reached, prevent customer fatigue' },
  ];

  return (
    <div className="bg-white border border-[#E6E2D8] p-6 shadow-sm space-y-5">
      {/* Pipeline Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#F0ECE1]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
              HOW RECOVERIQ RECOVERS REVENUE
            </h3>
          </div>
          <p className="text-xs text-stone-500 font-serif-editorial italic mt-0.5">
            From payment failure to recovered revenue.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500">
          <span className="px-2 py-0.5 border border-[#E6E2D8] bg-[#FAF9F5] text-stone-700 font-semibold">
            SYNTHETIC BENCHMARK & LIVE QUEUE PIPELINE
          </span>
        </div>
      </div>

      {/* 4 Sequential Stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {/* Stage 1: FIND THE RISK */}
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] border-t-2 border-t-amber-600 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold text-amber-900 uppercase tracking-wider">
                1. FIND THE RISK
              </span>
              <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-stone-900 tracking-tight">
              {formatINR(revenueAtRisk, { compact: true })}
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-snug">
              Detects failed and at-risk payments in real time.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E6E2D8] text-[10px] font-mono text-stone-500 flex items-center justify-between">
            <span>Current pool:</span>
            <span className="text-stone-800 font-semibold">Active queue</span>
          </div>
        </div>

        {/* Stage 2: PREDICT & EVALUATE */}
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] border-t-2 border-t-indigo-700 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold text-indigo-950 uppercase tracking-wider">
                2. PREDICT & EVALUATE
              </span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-950 tracking-tight">
              {formatINR(predictedRecoverableRevenue, { compact: true })}
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-snug">
              Scores recovery likelihood across 7 possible recovery actions.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E6E2D8] text-[10px] font-mono text-stone-500 flex items-center justify-between">
            <span>Model yield:</span>
            <span className="text-indigo-900 font-semibold">ML Probability & EV</span>
          </div>
        </div>

        {/* Stage 3: CHOOSE THE BEST SAFE ACTION */}
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] border-t-2 border-t-stone-800 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold text-stone-900 uppercase tracking-wider">
                3. CHOOSE THE BEST SAFE ACTION
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-stone-800" />
            </div>
            <div className="text-2xl font-bold font-mono text-stone-900 tracking-tight">
              4 Policy Gates
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-snug">
              Applies merchant policy guardrails and picks highest-EV safe action.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E6E2D8] text-[10px] font-mono text-stone-500 flex items-center justify-between">
            <span>Policy check:</span>
            <span className="text-stone-800 font-semibold">Safe EV Maximization</span>
          </div>
        </div>

        {/* Stage 4: RECOVER & TRACK */}
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] border-t-2 border-t-emerald-700 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold text-emerald-900 uppercase tracking-wider">
                4. RECOVER & TRACK
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-900 tracking-tight">
              {formatINR(revenueRecovered, { compact: true })}
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-snug">
              Executes recovery via optimal channel and records full audit trail.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E6E2D8] text-[10px] font-mono text-emerald-800 flex items-center justify-between">
            <span>Benchmark lift:</span>
            <span className="font-bold bg-emerald-100 text-emerald-950 px-1 py-0.5 border border-emerald-300">
              +{formatINR(incrementalRevenue, { compact: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Strip: 7 Canonical Actions Explained (Part 7) */}
      <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-[#EAE6DD] pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-stone-700" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-800">
              RecoverIQ Evaluates 7 Canonical Recovery Actions for Every Failed Payment
            </span>
          </div>
          <span className="text-[10px] font-mono text-stone-500 hidden sm:inline">
            Ranked by Policy-Safe Expected Value
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 pt-1">
          {canonicalActions.map((act) => (
            <div
              key={act.num}
              className="bg-white border border-[#E6E2D8] p-2.5 text-xs flex flex-col justify-between space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-stone-900 text-stone-50 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                  {act.num}
                </span>
                <span className="font-bold text-stone-900 text-[11px] truncate">
                  {act.name}
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-tight">
                {act.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
