import React from 'react';
import { PaymentRecord } from '../../types';
import { formatINR, formatFailureReason, formatPaymentMethod, formatActionShortLabel } from '../../utils/formatters';
import { ProbabilityBadge } from '../common/ProbabilityBadge';
import { PriorityBadge } from '../common/Badge';
import { ChevronRight, Sparkles, Layers } from 'lucide-react';

interface PriorityQueueProps {
  cases: PaymentRecord[];
  onSelectPayment?: (payment: PaymentRecord) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({ cases, onSelectPayment }) => {
  return (
    <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE1]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-stone-100 border border-stone-300 text-stone-800">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
              High-Priority At-Risk Queue
            </h3>
            <p className="text-xs text-stone-500">
              Highest expected-value failed payments requiring automated or operator-guided routing
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-stone-500">
          Showing <span className="text-stone-900 font-bold">{cases.length}</span> highest EV targets
        </div>
      </div>

      {/* Swiss Editorial Financial Table */}
      <div className="overflow-x-auto border border-[#E6E2D8]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF9F5] text-stone-600 uppercase tracking-wider font-mono text-[10px] border-b border-[#E6E2D8]">
              <th className="py-2.5 px-3">Payment ID</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Amount</th>
              <th className="py-2.5 px-3">Payment Method</th>
              <th className="py-2.5 px-3">Failure Reason</th>
              <th className="py-2.5 px-3">Recovery Likelihood</th>
              <th className="py-2.5 px-3">Expected Recovery</th>
              <th className="py-2.5 px-3">RecoverIQ Recommends</th>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3 text-right">View Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE6DD] bg-white">
            {cases.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[#FAF9F5] transition-colors group cursor-pointer"
                onClick={() => onSelectPayment && onSelectPayment(item)}
              >
                {/* ID */}
                <td className="py-3 px-3 font-mono font-semibold text-stone-900 whitespace-nowrap">
                  {item.id}
                </td>

                {/* Customer */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="font-semibold text-stone-900">{item.customer.customerName}</div>
                  <div className="text-[10px] font-mono text-stone-500">
                    {item.customer.segment} • LTV: {formatINR(item.customer.lifetimeValue)}
                  </div>
                </td>

                {/* Amount */}
                <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                  {formatINR(item.amount, { compact: false })}
                </td>

                {/* Method */}
                <td className="py-3 px-3 text-stone-700 whitespace-nowrap">
                  <div>{formatPaymentMethod(item.paymentMethod)}</div>
                  <div className="text-[10px] font-mono text-stone-500 truncate max-w-[150px]">{item.paymentMethodDetails}</div>
                </td>

                {/* Failure Reason */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="text-stone-800 font-medium">
                    {formatFailureReason(item.failureReason)}
                  </span>
                  <div className="text-[10px] font-mono text-stone-500">{item.failureCode}</div>
                </td>

                {/* Recovery Probability */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <ProbabilityBadge probability={item.recoveryProbability} size="sm" />
                </td>

                {/* Expected Value */}
                <td className="py-3 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                  {formatINR(item.expectedRecoveryValue, { compact: false })}
                </td>

                {/* Recommended Action */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono text-[11px] font-semibold">
                    {formatActionShortLabel(item.recommendedAction)}
                  </span>
                </td>

                {/* Priority */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <PriorityBadge priority={item.priority} />
                </td>

                {/* View CTA */}
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  <button
                    className="inline-flex items-center gap-1 text-[11px] text-stone-600 group-hover:text-stone-900 font-mono font-semibold transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectPayment) onSelectPayment(item);
                    }}
                  >
                    <span>View Decision</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
