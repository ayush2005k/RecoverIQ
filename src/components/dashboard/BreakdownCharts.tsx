import React from 'react';
import { FailureReasonBreakdown, PaymentMethodBreakdown } from '../../types';
import { formatINR, formatPercent } from '../../utils/formatters';
import { Layers, CreditCard } from 'lucide-react';

interface BreakdownChartsProps {
  failureBreakdown: FailureReasonBreakdown[];
  methodBreakdown: PaymentMethodBreakdown[];
}

export const BreakdownCharts: React.FC<BreakdownChartsProps> = ({
  failureBreakdown,
  methodBreakdown,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recovery by Failure Reason */}
      <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1] mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-700" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
                  WHERE RECOVERY WORKS BEST
                </h3>
              </div>
              <p className="text-xs text-stone-500 font-serif-editorial italic mt-0.5">
                Recovery performance by payment failure reason.
              </p>
            </div>
            <span className="text-[10px] font-mono text-stone-500 uppercase">
              CONVERSION EFFICIENCY
            </span>
          </div>

          <div className="space-y-4">
            {failureBreakdown.map((item) => {
              const ratePct = item.recoveryRate * 100;
              return (
                <div key={item.reason} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 truncate max-w-[200px]">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-stone-500 text-[11px]">
                        {formatINR(item.recoveredRevenue, { compact: true })} / {formatINR(item.revenueAtRisk, { compact: true })}
                      </span>
                      <span className="text-emerald-900 font-bold w-12 text-right">
                        {formatPercent(item.recoveryRate)}
                      </span>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div className="w-full bg-[#F2EFE9] h-2 overflow-hidden">
                    <div
                      className="h-full bg-stone-900 transition-all duration-500"
                      style={{ width: `${ratePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-[11px] text-stone-500 font-mono">
          <span>Highest Yield Vector: Gateway Timeout</span>
          <span className="text-emerald-800 font-bold">88.8% Realized</span>
        </div>
      </div>

      {/* Recovery by Payment Method */}
      <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1] mb-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-stone-700" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
                  RECOVERY BY PAYMENT METHOD
                </h3>
              </div>
              <p className="text-xs text-stone-500 font-serif-editorial italic mt-0.5">
                Which payment methods recover best?
              </p>
            </div>
            <span className="text-[10px] font-mono text-stone-500 uppercase">
              VOLUME & CAPTURE
            </span>
          </div>

          <div className="space-y-4">
            {methodBreakdown.map((item) => {
              const ratePct = item.recoveryRate * 100;
              return (
                <div key={item.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800">
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-stone-100 text-stone-600 border border-stone-200">
                        {item.sharePercent}% share
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-stone-500 text-[11px]">
                        {formatINR(item.recoveredRevenue, { compact: true })}
                      </span>
                      <span className="text-emerald-900 font-bold w-12 text-right">
                        {formatPercent(item.recoveryRate)}
                      </span>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div className="w-full bg-[#F2EFE9] h-2 overflow-hidden">
                    <div
                      className="h-full bg-amber-800 transition-all duration-500"
                      style={{ width: `${ratePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-[11px] text-stone-500 font-mono">
          <span>Dominant Instrument: UPI</span>
          <span className="text-stone-900 font-bold">43% Total Share</span>
        </div>
      </div>
    </div>
  );
};
