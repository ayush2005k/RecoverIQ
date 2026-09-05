import React from 'react';
import { DecisionRecord } from '../../types';
import { formatINR, formatRelativeTime, formatPercent } from '../../utils/formatters';
import { PolicyBadge, ExecutionBadge } from '../common/Badge';
import { FileCheck, ShieldCheck } from 'lucide-react';

interface RecentDecisionsProps {
  decisions: DecisionRecord[];
  onSelectDecision?: (decision: DecisionRecord) => void;
  onViewAll?: () => void;
}

export const RecentDecisions: React.FC<RecentDecisionsProps> = ({ decisions, onSelectDecision, onViewAll }) => {
  return (
    <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE1]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-stone-100 border border-stone-300 text-stone-800">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
              RECENT RECOVERY DECISIONS
            </h3>
            <p className="text-xs text-stone-500 font-serif-editorial italic">
              Every recovery decision, policy check, and execution outcome.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-stone-500">
            Showing last <span className="text-stone-900 font-bold">{decisions.length}</span> policy evaluations
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="px-3 py-1.5 text-xs font-mono font-bold bg-stone-900 hover:bg-stone-800 text-stone-100 border border-stone-900 transition-colors uppercase tracking-wider"
            >
              Open Full Audit Ledger →
            </button>
          )}
        </div>
      </div>

      {/* Swiss Editorial Financial Table */}
      <div className="overflow-x-auto border border-[#E6E2D8]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF9F5] text-stone-600 uppercase tracking-wider font-mono text-[10px] border-b border-[#E6E2D8]">
              <th className="py-2.5 px-3">Decision ID</th>
              <th className="py-2.5 px-3">Payment ID</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Recovery Likelihood</th>
              <th className="py-2.5 px-3">Recommended Action</th>
              <th className="py-2.5 px-3">Expected Recovery</th>
              <th className="py-2.5 px-3">Guardrails</th>
              <th className="py-2.5 px-3">Outcome</th>
              <th className="py-2.5 px-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE6DD] bg-white">
            {decisions.map((dec) => (
              <tr
                key={dec.id}
                className="hover:bg-[#FAF9F5] transition-colors group cursor-pointer"
                onClick={() => onSelectDecision && onSelectDecision(dec)}
              >
                {/* Decision ID */}
                <td className="py-3 px-3 font-mono font-medium text-stone-700 whitespace-nowrap">
                  {dec.id}
                </td>

                {/* Payment ID */}
                <td className="py-3 px-3 font-mono font-semibold text-stone-900 whitespace-nowrap">
                  {dec.paymentId}
                </td>

                {/* Customer & Amount */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="font-semibold text-stone-900">{dec.customerName}</div>
                  <div className="text-[11px] font-mono text-stone-600">{formatINR(dec.amount)}</div>
                </td>

                {/* Model Score */}
                <td className="py-3 px-3 font-mono font-semibold text-emerald-800 whitespace-nowrap">
                  {formatPercent(dec.recoveryProbability)}
                </td>

                {/* Action Selected */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="font-mono text-stone-900 text-[11px] font-semibold">
                    {dec.actionLabel}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate max-w-[240px]" title={dec.aiExplanationSnippet}>
                    {dec.aiExplanationSnippet}
                  </div>
                </td>

                {/* Expected Value */}
                <td className="py-3 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                  {formatINR(dec.expectedRecovery, { compact: false })}
                </td>

                {/* Policy Guardrail */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <PolicyBadge status={dec.policyStatus} />
                </td>

                {/* Execution Status */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <ExecutionBadge status={dec.executionStatus} />
                </td>

                {/* Time */}
                <td className="py-3 px-3 text-right font-mono text-stone-500 whitespace-nowrap">
                  {formatRelativeTime(dec.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
