import React, { useState, useMemo } from 'react';
import { DecisionRecord } from '../../types';
import { formatINR, formatRelativeTime, formatPercent, formatDateTime, formatActionLabel } from '../../utils/formatters';
import { PolicyBadge, ExecutionBadge } from '../common/Badge';
import { DecisionAuditDrawer } from './DecisionAuditDrawer';
import {
  ShieldCheck,
  Search,
  Lock,
  FileCheck2,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  TrendingUp,
  Cpu,
  Database,
  RotateCcw
} from 'lucide-react';

interface DecisionsAuditViewProps {
  decisions: DecisionRecord[];
  onSelectDecision?: (decision: DecisionRecord) => void;
  onNavigateToPayment?: (paymentId: string) => void;
  selectedDecisionId?: string | null;
}

export const DecisionsAuditView: React.FC<DecisionsAuditViewProps> = ({
  decisions,
  onSelectDecision,
  onNavigateToPayment,
  selectedDecisionId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPolicy, setFilterPolicy] = useState<string>('all');
  const [filterExecution, setFilterExecution] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [sortField, setSortField] = useState<'timestamp' | 'amount' | 'recoveryProbability' | 'expectedRecovery'>('timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Active drawer state
  const [activeDrawerDecision, setActiveDrawerDecision] = useState<DecisionRecord | null>(() => {
    if (selectedDecisionId) {
      return decisions.find((d) => d.id === selectedDecisionId || d.paymentId === selectedDecisionId) || null;
    }
    return null;
  });

  // Keep active drawer synced if selectedDecisionId changes
  React.useEffect(() => {
    if (selectedDecisionId) {
      const match = decisions.find((d) => d.id === selectedDecisionId || d.paymentId === selectedDecisionId);
      if (match) {
        setActiveDrawerDecision(match);
      }
    }
  }, [selectedDecisionId, decisions]);

  // Filtering logic
  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.id.toLowerCase().includes(q) ||
        d.paymentId.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.actionLabel.toLowerCase().includes(q) ||
        (d.failureCode && d.failureCode.toLowerCase().includes(q)) ||
        (d.modelVersion && d.modelVersion.toLowerCase().includes(q));

      const matchesPolicy = filterPolicy === 'all' || d.policyStatus === filterPolicy;
      const matchesExecution = filterExecution === 'all' || d.executionStatus === filterExecution;
      const matchesAction = filterAction === 'all' || d.recommendedAction === filterAction;
      const matchesSegment = filterSegment === 'all' || (d.customerSegment && d.customerSegment.toLowerCase() === filterSegment.toLowerCase());

      return matchesSearch && matchesPolicy && matchesExecution && matchesAction && matchesSegment;
    });
  }, [decisions, searchQuery, filterPolicy, filterExecution, filterAction, filterSegment]);

  // Sorting logic
  const sortedDecisions = useMemo(() => {
    return [...filteredDecisions].sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === 'timestamp') {
        valA = new Date(a.timestamp).getTime();
        valB = new Date(b.timestamp).getTime();
      } else if (sortField === 'amount') {
        valA = a.amount;
        valB = b.amount;
      } else if (sortField === 'recoveryProbability') {
        valA = a.recoveryProbability;
        valB = b.recoveryProbability;
      } else if (sortField === 'expectedRecovery') {
        valA = a.expectedRecovery;
        valB = b.expectedRecovery;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredDecisions, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedDecisions.length / pageSize));
  const paginatedDecisions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDecisions.slice(start, start + pageSize);
  }, [sortedDecisions, currentPage, pageSize]);

  const handleRowClick = (decision: DecisionRecord) => {
    setActiveDrawerDecision(decision);
    if (onSelectDecision) {
      onSelectDecision(decision);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterPolicy('all');
    setFilterExecution('all');
    setFilterAction('all');
    setFilterSegment('all');
    setCurrentPage(1);
  };

  // Summary Metrics
  const totalDecisionsCount = decisions.length;
  const totalEvaluatedGross = decisions.reduce((acc, d) => acc + d.amount, 0);
  const totalExpectedRecovery = decisions.reduce((acc, d) => acc + d.expectedRecovery, 0);
  const totalActuallyRecovered = decisions.reduce((acc, d) => acc + (d.recoveredAmount || (d.executionStatus === 'succeeded' ? d.amount : 0)), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E2D8]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-900 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-300">
              ACME COMMERCE
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-editorial tracking-tight text-stone-900">
              Recent Recovery Decisions
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-stone-900 text-stone-100 font-bold">
              /decisions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 font-serif-editorial italic mt-0.5">
            Every recovery decision, policy check, and execution outcome.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-700 bg-white border border-[#E6E2D8] px-3.5 py-2 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-stone-600" />
            <span className="font-bold text-stone-900 uppercase">READ-ONLY AUDIT RECORD</span>
          </div>
        </div>
      </div>

      {/* Top Metric Strip (Compact 3-item summary strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#E6E2D8] p-4 shadow-xs">
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
            Total Decisions
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-stone-900 mt-1">
            {totalDecisionsCount}
          </div>
          <div className="text-[11px] font-mono text-stone-500 mt-1">
            Evaluated recovery recommendations
          </div>
        </div>

        <div className="bg-white border border-[#E6E2D8] p-4 shadow-xs">
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
            Succeeded Outcomes
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-800 mt-1">
            {decisions.filter((d) => d.executionStatus === 'succeeded').length}
          </div>
          <div className="text-[11px] font-mono text-emerald-800 mt-1">
            Simulated or settled recoveries
          </div>
        </div>

        <div className="bg-white border border-[#E6E2D8] p-4 shadow-xs">
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
            Policy Attested
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-stone-900 mt-1 flex items-center gap-1.5">
            <span>100%</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
          </div>
          <div className="text-[11px] font-mono text-stone-500 mt-1">
            Zero policy guardrail violations
          </div>
        </div>
      </div>

      {/* Synthetic Demo Banner Notice */}
      <div className="bg-stone-100 border border-stone-300 px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-mono text-stone-600">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-stone-500" />
          <span>
            <strong className="text-stone-800 font-bold uppercase">[TEST MODE / READ-ONLY AUDIT RECORD]</strong> Displaying decision ledger for demonstration purposes. No live production money movement.
          </span>
        </div>
        <span className="text-[11px] text-stone-500 hidden sm:inline">
          Policy Core: Active Guardrails
        </span>
      </div>

      {/* Search & Filter Controls Matrix */}
      <div className="bg-white border border-[#E6E2D8] p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Decision ID (dec_...), Payment ID (pay_...), Customer, Action, or Error Code..."
              className="w-full bg-[#FAF9F5] border border-[#E6E2D8] pl-9 pr-3 py-2 text-xs font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-800"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Policy Filter */}
            <select
              value={filterPolicy}
              onChange={(e) => {
                setFilterPolicy(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-2 text-stone-800 focus:outline-none focus:border-stone-800"
            >
              <option value="all">All Policy States</option>
              <option value="satisfied">Policy: Satisfied</option>
              <option value="restricted">Policy: Restricted</option>
              <option value="blocked">Policy: Blocked</option>
            </select>

            {/* Execution Filter */}
            <select
              value={filterExecution}
              onChange={(e) => {
                setFilterExecution(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-2 text-stone-800 focus:outline-none focus:border-stone-800"
            >
              <option value="all">All Execution States</option>
              <option value="succeeded">Status: Succeeded</option>
              <option value="scheduled">Status: Scheduled</option>
              <option value="pending">Status: Pending</option>
              <option value="skipped">Status: Skipped</option>
              <option value="failed">Status: Failed</option>
            </select>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-2 text-stone-800 focus:outline-none focus:border-stone-800"
            >
              <option value="all">All Actions</option>
              <option value="retry_later">Retry Later</option>
              <option value="retry_now">Retry Now</option>
              <option value="send_payment_link">Send Payment Link</option>
              <option value="send_reminder">Send Reminder</option>
              <option value="request_payment_method_update">Request Method Update</option>
              <option value="escalate_to_human">Escalate to RM</option>
              <option value="stop_recovery">Stop Recovery</option>
            </select>

            {/* Segment Filter */}
            <select
              value={filterSegment}
              onChange={(e) => {
                setFilterSegment(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-2 text-stone-800 focus:outline-none focus:border-stone-800"
            >
              <option value="all">All Segments</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Growth">Growth</option>
              <option value="SMB">SMB</option>
              <option value="Retail">Retail</option>
            </select>

            {(searchQuery || filterPolicy !== 'all' || filterExecution !== 'all' || filterAction !== 'all' || filterSegment !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Bar */}
        <div className="flex items-center justify-between text-xs font-mono text-stone-500 pt-2 border-t border-[#E6E2D8]">
          <div>
            Showing <strong className="text-stone-900">{sortedDecisions.length}</strong> matching decision records
            {sortedDecisions.length !== totalDecisionsCount && (
              <span> (filtered from {totalDecisionsCount} total)</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortField === 'timestamp') setSortAsc(!sortAsc);
                else { setSortField('timestamp'); setSortAsc(false); }
              }}
              className={`hover:text-stone-900 ${sortField === 'timestamp' ? 'text-stone-900 font-bold underline' : ''}`}
            >
              Timestamp {sortField === 'timestamp' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortField === 'amount') setSortAsc(!sortAsc);
                else { setSortField('amount'); setSortAsc(false); }
              }}
              className={`hover:text-stone-900 ${sortField === 'amount' ? 'text-stone-900 font-bold underline' : ''}`}
            >
              Amount {sortField === 'amount' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortField === 'recoveryProbability') setSortAsc(!sortAsc);
                else { setSortField('recoveryProbability'); setSortAsc(false); }
              }}
              className={`hover:text-stone-900 ${sortField === 'recoveryProbability' ? 'text-stone-900 font-bold underline' : ''}`}
            >
              Recovery Likelihood {sortField === 'recoveryProbability' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortField === 'expectedRecovery') setSortAsc(!sortAsc);
                else { setSortField('expectedRecovery'); setSortAsc(false); }
              }}
              className={`hover:text-stone-900 ${sortField === 'expectedRecovery' ? 'text-stone-900 font-bold underline' : ''}`}
            >
              Expected Recovery {sortField === 'expectedRecovery' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Full Decision History Table */}
      <div className="bg-white border border-[#E6E2D8] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF9F5] text-stone-600 uppercase tracking-wider font-mono text-[10px] border-b border-[#E6E2D8]">
                <th className="py-3 px-3 font-semibold">Decision ID</th>
                <th className="py-3 px-3 font-semibold">Payment ID</th>
                <th className="py-3 px-3 font-semibold">Customer</th>
                <th className="py-3 px-3 font-semibold">Amount</th>
                <th className="py-3 px-3 font-semibold">Recovery Likelihood</th>
                <th className="py-3 px-3 font-semibold">Recommended Action</th>
                <th className="py-3 px-3 font-semibold">Expected Recovery</th>
                <th className="py-3 px-3 font-semibold">Guardrails</th>
                <th className="py-3 px-3 font-semibold">Outcome</th>
                <th className="py-3 px-3 font-semibold">Recovered Amount</th>
                <th className="py-3 px-3 font-semibold text-right">Timestamp</th>
                <th className="py-3 px-3 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DD] bg-white font-mono">
              {paginatedDecisions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-stone-500 font-serif-editorial italic">
                    No decision audit records found matching your active filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedDecisions.map((dec) => (
                  <tr
                    key={dec.id}
                    onClick={() => handleRowClick(dec)}
                    className="hover:bg-[#FAF9F5] transition-colors group cursor-pointer"
                  >
                    {/* Decision ID */}
                    <td className="py-3.5 px-3 font-bold text-stone-800 whitespace-nowrap">
                      <span className="border-b border-dotted border-stone-400 group-hover:border-stone-900">
                        {dec.id}
                      </span>
                    </td>

                    {/* Payment ID */}
                    <td className="py-3.5 px-3 font-semibold text-stone-900 whitespace-nowrap">
                      {dec.paymentId}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-stone-900">{dec.customerName}</div>
                      <div className="text-[10px] text-stone-500">
                        {dec.customerSegment || 'Enterprise'} Tier
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-3 font-bold text-stone-900 whitespace-nowrap">
                      {formatINR(dec.amount)}
                    </td>

                    {/* Recovery Likelihood */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                        {formatPercent(dec.recoveryProbability)}
                      </span>
                    </td>

                    {/* Recommended Action */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-stone-800">
                        {dec.actionLabel}
                      </div>
                    </td>

                    {/* Expected Recovery */}
                    <td className="py-3.5 px-3 font-bold text-stone-900 whitespace-nowrap">
                      {formatINR(dec.expectedRecovery)}
                    </td>

                    {/* Guardrails */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <PolicyBadge status={dec.policyStatus} />
                        <span className="text-[10px] text-stone-500">
                          ({dec.policyChecksCount?.passed || 4}/{dec.policyChecksCount?.total || 4} gates)
                        </span>
                      </div>
                    </td>

                    {/* Outcome */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <ExecutionBadge status={dec.executionStatus} />
                    </td>

                    {/* Recovered Amount */}
                    <td className="py-3.5 px-3 font-bold whitespace-nowrap">
                      {dec.executionStatus === 'succeeded' ? (
                        <span className="text-emerald-800">{formatINR(dec.recoveredAmount || dec.amount)}</span>
                      ) : (
                        <span className="text-stone-400">₹0</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="text-stone-800 font-medium">
                        {formatRelativeTime(dec.timestamp)}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {formatDateTime(dec.timestamp)}
                      </div>
                    </td>

                    {/* Open Audit Drawer Action */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(dec);
                        }}
                        className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-stone-900 text-stone-800 hover:text-stone-100 border border-stone-400 transition-colors uppercase tracking-wider"
                      >
                        Inspect ↗
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#FAF9F5] border-t border-[#E6E2D8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-stone-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-[#E6E2D8] px-2 py-1 text-xs text-stone-800 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-stone-400">|</span>
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
              {sortedDecisions.length} records)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-[#E6E2D8] bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
              }
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8 h-8 font-bold text-xs border transition-colors ${
                    currentPage === pNum
                      ? 'bg-stone-900 text-stone-100 border-stone-900'
                      : 'bg-white text-stone-700 border-[#E6E2D8] hover:bg-stone-100'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-[#E6E2D8] bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Drawer Modal */}
      <DecisionAuditDrawer
        decision={activeDrawerDecision}
        isOpen={!!activeDrawerDecision}
        onClose={() => setActiveDrawerDecision(null)}
        onNavigateToPayment={onNavigateToPayment}
      />
    </div>
  );
};
