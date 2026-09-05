import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Activity, TrendingUp } from 'lucide-react';

interface EditorialHeroProps {
  onRunStrategy?: () => void;
  onInspectQueue: () => void;
  isRunningStrategy?: boolean;
}

export const EditorialHero: React.FC<EditorialHeroProps> = ({
  onRunStrategy,
  onInspectQueue,
  isRunningStrategy,
}) => {
  return (
    <section className="bg-white border border-[#E6E2D8] p-6 sm:p-8 relative shadow-sm">
      {/* Editorial Category Eyebrow */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tracking-widest uppercase text-stone-500 pb-3 border-b border-[#F0ECE1] mb-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-800">ACME COMMERCE • RECOVERY INTELLIGENCE</span>
          <span className="text-stone-300">|</span>
          <span className="text-stone-600">VOL. IX — POLICY GUARDRAILS</span>
        </div>
        <div className="flex items-center gap-3 text-stone-500">
          <span className="font-mono text-[10px] bg-stone-100 px-2 py-0.5 border border-stone-200 text-stone-700">
            MODEL: EV-MAX-V9.4
          </span>
          <span className="font-mono text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            ONLINE
          </span>
        </div>
      </div>

      {/* Main Editorial Headline */}
      <div className="space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif-editorial tracking-tight text-stone-900 leading-[1.1]">
          The Art of Strategic Recovery.
        </h2>

        {/* Pull Quote */}
        <blockquote className="border-l-4 border-stone-900 pl-4 py-1 my-3">
          <p className="text-base sm:text-lg font-serif-editorial italic text-stone-700 leading-snug">
            “Blind retries merely consume authorization goodwill; intelligent routing treats every failure as an economic optimization problem.”
          </p>
        </blockquote>

        {/* Narrative Description */}
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-3xl">
          Acme Commerce connects its failed-payment data to RecoverIQ. RecoverIQ analyzes each customer's failed payment, relationship history, and deterministic policy guardrails to orchestrate the safest, highest-value recovery action.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <button
            onClick={onRunStrategy}
            disabled={isRunningStrategy}
            className="flex items-center gap-2 px-5 py-3 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-stone-900 shadow-sm active:scale-[0.98]"
          >
            <Sparkles className={`w-4 h-4 text-amber-400 ${isRunningStrategy ? 'animate-spin' : ''}`} />
            <span>{isRunningStrategy ? 'Evaluating recovery strategy...' : 'RUN AI STRATEGY'}</span>
          </button>

          <button
            onClick={onInspectQueue}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-stone-50 text-stone-900 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-stone-900 shadow-sm active:scale-[0.98]"
          >
            <span>INSPECT QUEUE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
