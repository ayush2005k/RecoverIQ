import React, { useState, useEffect } from 'react';
import { PaymentRecord, CandidateAction, DecisionRecord, CanonicalAction } from '../../types';
import { api } from '../../services/api';
import {
  formatINR,
  formatFailureReason,
  formatPaymentMethod,
  formatPercent,
  formatRelativeTime,
  formatActionLabel,
  formatActionShortLabel,
} from '../../utils/formatters';
import {
  getAllCanonicalCandidateActions,
  getStandardPolicyGuardrails,
  getStructuredDecisionExplanation,
} from '../../utils/recoveryIntelligence';
import { PriorityBadge, StatusBadge, PolicyBadge, ExecutionBadge } from '../common/Badge';
import { ProbabilityBadge } from '../common/ProbabilityBadge';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  CreditCard,
  Layers,
  ArrowRight,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  RotateCcw,
  Zap,
  Activity,
  UserCheck,
  HelpCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface PaymentDecisionWorkspaceProps {
  payment: PaymentRecord;
  onBack: () => void;
  onNavigateToDecision?: (decisionId: string) => void;
  onExecuteAction?: (paymentId: string, action: string) => void;
}

type SimulationState = 'idle' | 'pending' | 'succeeded' | 'failed';

export const PaymentDecisionWorkspace: React.FC<PaymentDecisionWorkspaceProps> = ({
  payment: initialPayment,
  onBack,
  onNavigateToDecision,
  onExecuteAction,
}) => {
  const [currentPayment, setCurrentPayment] = useState<PaymentRecord>(initialPayment);
  const payment = currentPayment;
  const [isDeciding, setIsDeciding] = useState<boolean>(false);
  const [decisionNotification, setDecisionNotification] = useState<string | null>(null);

  // Sync state if initialPayment prop updates
  useEffect(() => {
    setCurrentPayment(initialPayment);
    // Fetch full payment detail with all 7 candidate actions and guardrails if not populated
    if (!initialPayment.candidateActions || initialPayment.candidateActions.length === 0) {
      api.getPaymentById(initialPayment.id).then((fresh) => {
        if (fresh) setCurrentPayment(fresh);
      }).catch((e) => console.warn('Could not refresh payment detail:', e));
    }
  }, [initialPayment.id]);

  // Candidate actions, guardrails, structuredExplanation directly from backend
  const candidateActions =
    currentPayment.candidateActions && currentPayment.candidateActions.length > 0
      ? currentPayment.candidateActions
      : getAllCanonicalCandidateActions(currentPayment);

  const guardrails =
    currentPayment.guardrails && currentPayment.guardrails.length > 0
      ? currentPayment.guardrails
      : getStandardPolicyGuardrails(currentPayment);

  const structuredExplanation =
    currentPayment.structuredExplanation || getStructuredDecisionExplanation(currentPayment);

  // Active selected strategy (defaults to recommended action)
  const [selectedActionKey, setSelectedActionKey] = useState<CanonicalAction>(
    currentPayment.recommendedAction
  );

  useEffect(() => {
    setSelectedActionKey(currentPayment.recommendedAction);
  }, [currentPayment.recommendedAction]);

  // Simulation State Engine
  const [simState, setSimState] = useState<SimulationState>('idle');
  const [simRecoveredAmount, setSimRecoveredAmount] = useState<number>(0);
  const [simTimestamp, setSimTimestamp] = useState<string>('');
  const [simTxId, setSimTxId] = useState<string>('');
  const [simLogs, setSimLogs] = useState<string[]>([]);

  // UI state
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const activeCandidate =
    candidateActions.find((c) => c.action === selectedActionKey) || candidateActions[0];

  // Derive associated decision ID
  const decisionRefId = `dec_${currentPayment.id.replace('pay_', '')}`;

  const handleCopyId = () => {
    try {
      navigator.clipboard.writeText(currentPayment.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

  // Trigger backend decision engine evaluation on-demand
  const handleTriggerDecision = async () => {
    try {
      setIsDeciding(true);
      setDecisionNotification(null);
      const res = await api.decidePayment(currentPayment.id);
      setCurrentPayment((prev) => ({
        ...prev,
        recommendedAction: res.recommendedAction,
        recoveryProbability: res.baseRecoveryProbability,
        expectedRecoveryValue: res.expectedRecoveryValue,
        candidateActions: res.candidateActions,
        guardrails: res.guardrails,
        structuredExplanation: res.structuredExplanation,
        aiExplanation: res.aiExplanationSnippet,
      }));
      setSelectedActionKey(res.recommendedAction);
      setDecisionNotification(
        `RecoverIQ Decision Engine evaluated all 7 actions: ${res.actionLabel} selected (EV: ₹${res.expectedRecoveryValue.toLocaleString('en-IN')})`
      );
      setTimeout(() => setDecisionNotification(null), 5000);
    } catch (e: any) {
      console.error('Decision pipeline error:', e);
      setDecisionNotification('Failed to execute decision pipeline: ' + (e?.message || 'Server error'));
    } finally {
      setIsDeciding(false);
    }
  };

  // Run Simulation Handler using real backend POST /payments/{id}/execute
  const handleSimulateRecovery = async () => {
    if (simState === 'pending') return;
    if (activeCandidate.policyStatus === 'blocked') return;

    setSimState('pending');
    setSimLogs([
      `[${new Date().toISOString()}] Initiating simulated execution for [${activeCandidate.action}]...`,
      `[${new Date().toISOString()}] Invoking RecoverIQ rail endpoint POST /payments/${currentPayment.id}/execute...`,
    ]);

    try {
      const result = await api.executeSimulation(currentPayment.id, activeCandidate.action);
      const now = new Date(result.executedAt || Date.now());
      setSimTxId(result.simulatedReference);
      setSimTimestamp(now.toUTCString());

      if (result.recovered) {
        setSimState('succeeded');
        setSimRecoveredAmount(result.recoveredAmount);
        setCurrentPayment((prev) => ({
          ...prev,
          status: 'recovered',
          recoveredAmount: result.recoveredAmount,
          executionStatus: 'succeeded',
        }));
      } else {
        setSimState('failed');
        setSimRecoveredAmount(0);
        setCurrentPayment((prev) => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          executionStatus: 'failed',
        }));
      }

      if (result.executionLogs && result.executionLogs.length > 0) {
        setSimLogs(result.executionLogs);
      } else {
        setSimLogs((prev) => [
          ...prev,
          `[${now.toISOString()}] Simulated Gateway Response: ${
            result.recovered
              ? 'HTTP 200 OK — Capture Authorization Settled.'
              : 'HTTP 402 Decline — Rail rejected representation.'
          }`,
          `[${now.toISOString()}] Simulated Reference: ${result.simulatedReference}. Recovered: ₹${result.recoveredAmount.toLocaleString('en-IN')}.`,
        ]);
      }

      if (onExecuteAction) {
        onExecuteAction(currentPayment.id, activeCandidate.action);
      }
    } catch (err: any) {
      console.error('Simulation execution error:', err);
      setSimState('failed');
      setSimRecoveredAmount(0);
      const msg = err?.response?.data?.detail || err?.message || 'Simulation execution failed';
      setSimLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] ERROR: ${msg}`,
      ]);
    }
  };

  const handleResetSimulation = () => {
    setSimState('idle');
    setSimRecoveredAmount(0);
    setSimTimestamp('');
    setSimTxId('');
    setSimLogs([]);
  };

  const handleViewAuditRecord = () => {
    if (onNavigateToDecision) {
      onNavigateToDecision(decisionRefId);
    }
  };

  // Format failedAt timestamp
  const failedAtDate = new Date(payment.failedAt);
  const formattedFailedDate = failedAtDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOP BREADCRUMB & PAYMENT HEADER */}
      <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
        {/* Back button & IDs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0ECE1] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-[#FAF9F5] border border-stone-800 text-stone-800 hover:bg-stone-200 transition-colors"
              title="Return to Payments Worklist"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-stone-900">{payment.id}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
                  title="Copy Payment ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span className="text-stone-300">•</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-1.5 py-0.5 border border-amber-300">
                  ACME COMMERCE
                </span>
                <span className="text-stone-300">•</span>
                <PriorityBadge priority={payment.priority} />
                <StatusBadge status={payment.status} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif-editorial text-stone-900 tracking-tight mt-0.5">
                Payment Recovery Intelligence Workspace
              </h1>
            </div>
          </div>

          {/* Action Button & Expected Value Pill */}
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleTriggerDecision}
              disabled={isDeciding}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-mono font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
              title="Execute backend decision pipeline: POST /payments/{id}/decide"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isDeciding ? 'animate-spin' : ''}`} />
              <span>{isDeciding ? 'EVALUATING...' : 'EVALUATE DECISION'}</span>
            </button>

            {/* Gross Amount & Expected Value Pill */}
            <div className="flex items-center gap-4 bg-[#FAF9F5] border border-[#E6E2D8] px-4 py-2.5">
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono text-stone-500 font-semibold">Gross Amount</div>
                <div className="font-mono font-bold text-stone-900 text-lg sm:text-xl">
                  {formatINR(payment.amount, { compact: false })}
                </div>
              </div>
              <div className="h-8 w-[1px] bg-[#E6E2D8]" />
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono text-emerald-800 font-bold">Expected Recovery (EV)</div>
                <div className="font-mono font-bold text-emerald-900 text-lg sm:text-xl">
                  {formatINR(payment.expectedRecoveryValue, { compact: false })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Decision Engine Toast */}
        {decisionNotification && (
          <div className="p-3 bg-stone-900 text-stone-50 border border-stone-800 flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{decisionNotification}</span>
            </div>
            <button
              onClick={() => setDecisionNotification(null)}
              className="text-stone-400 hover:text-stone-100 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 1: Detailed Payment Header Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Status */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Payment Status</div>
            <div className="font-mono font-bold text-xs text-stone-900 uppercase mt-1">
              {payment.status.replace('_', ' ')}
            </div>
            <div className="text-[10px] text-emerald-800 font-mono mt-0.5 font-medium">Policy-Verified Active</div>
          </div>

          {/* Failure Reason */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Failure Reason</div>
            <div className="font-semibold text-xs text-amber-900 truncate mt-1">
              {formatFailureReason(payment.failureReason)}
            </div>
            <div className="text-[10px] text-stone-500 truncate mt-0.5">Decline Category</div>
          </div>

          {/* Error Code */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Error Code</div>
            <div className="font-mono font-bold text-[11px] text-rose-950 truncate mt-1 bg-rose-50 border border-rose-200 px-1 py-0.5 inline-block">
              {payment.failureCode}
            </div>
          </div>

          {/* Payment Method */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Payment Method</div>
            <div className="font-semibold text-xs text-stone-900 truncate mt-1">
              {formatPaymentMethod(payment.paymentMethod)}
            </div>
            <div className="font-mono text-[10px] text-stone-500 truncate mt-0.5" title={payment.paymentMethodDetails}>
              {payment.paymentMethodDetails}
            </div>
          </div>

          {/* Timestamp */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Timestamp</div>
            <div className="font-mono text-xs font-bold text-stone-900 truncate mt-1" title={formattedFailedDate}>
              {formatRelativeTime(payment.failedAt)}
            </div>
            <div className="font-mono text-[9px] text-stone-500 truncate mt-0.5">
              {formattedFailedDate}
            </div>
          </div>

          {/* Retry Count */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Retry Quota</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-mono font-bold text-xs text-stone-900">
                {payment.retryCount} / {payment.maxRetriesAllowed}
              </span>
              <span className="text-[10px] font-mono text-stone-500">used</span>
            </div>
            <div className="flex gap-1 mt-1.5">
              {Array.from({ length: payment.maxRetriesAllowed }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 ${
                    i < payment.retryCount ? 'bg-amber-600' : 'bg-stone-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CUSTOMER CONTEXT & 3. RECOVERIQ INTELLIGENCE (2 Cards side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 2: CUSTOMER CONTEXT (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#FAF9F5] border border-stone-300 text-stone-800">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
                  Customer Profile & Financial History
                </h2>
                <p className="text-xs text-stone-500">Acme Commerce customer profile and transaction health ledger</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-stone-900 text-stone-50 border border-stone-900">
              {payment.customer.segment} Tier
            </span>
          </div>

          {/* Customer Details Table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Customer Name */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Customer Name</div>
              <div className="font-bold text-xs text-stone-900 truncate mt-0.5">
                {payment.customer.customerName}
              </div>
              <div className="text-[10px] font-mono text-stone-500 truncate mt-0.5">
                {payment.customer.customerId}
              </div>
            </div>

            {/* Customer Segment */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Segment & Tier</div>
              <div className="font-bold text-xs text-stone-900 mt-0.5">
                {payment.customer.segment}
              </div>
              <div className="text-[10px] font-mono text-stone-500 truncate mt-0.5" title={payment.customer.email}>
                {payment.customer.email}
              </div>
            </div>

            {/* LTV */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Customer LTV</div>
              <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
                {formatINR(payment.customer.lifetimeValue)}
              </div>
              <div className="text-[10px] text-emerald-800 font-mono mt-0.5">High Value Client</div>
            </div>

            {/* Total Transactions */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Total Transactions</div>
              <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
                {payment.customer.totalSuccessfulPayments + payment.customer.totalFailedPayments} lifetime
              </div>
              <div className="text-[10px] text-stone-600 font-mono mt-0.5">
                {payment.customer.totalSuccessfulPayments} succ / {payment.customer.totalFailedPayments} fail
              </div>
            </div>

            {/* Historical Success Rate */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Historical Success Rate</div>
              <div className="font-mono font-bold text-emerald-900 text-xs mt-0.5">
                {formatPercent(payment.customer.historicalRecoveryRate)}
              </div>
              <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                Baseline reliability
              </div>
            </div>

            {/* Recovery Latency */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Avg Recovery Latency</div>
              <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
                {payment.customer.avgRecoveryLatencyHours} hours
              </div>
              <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                Past recovered: {payment.customer.totalSuccessfulPayments}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: RECOVERIQ INTELLIGENCE SUMMARY (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-100 border border-amber-300 text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
                  RecoverIQ Intelligence Synthesis
                </h2>
                <p className="text-xs text-stone-500">AI Recovery Decision Engine with expected value optimization</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-50 text-amber-950 border border-amber-300">
              CONFIDENCE: 94.2%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Recovery Probability */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] space-y-1">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Recovery Prob</div>
              <div className="font-mono font-bold text-base text-stone-900">
                {formatPercent(payment.recoveryProbability)}
              </div>
              <ProbabilityBadge probability={payment.recoveryProbability} />
            </div>

            {/* Expected Recovery Value */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] space-y-1">
              <div className="text-[10px] font-mono text-emerald-800 font-bold uppercase">Expected Value (EV)</div>
              <div className="font-mono font-bold text-base text-emerald-900">
                {formatINR(payment.expectedRecoveryValue)}
              </div>
              <div className="text-[10px] text-stone-500 font-mono">Prob × Gross</div>
            </div>

            {/* Confidence Score */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] space-y-1">
              <div className="text-[10px] font-mono text-stone-500 uppercase">Model Confidence</div>
              <div className="font-mono font-bold text-base text-stone-900">94.2%</div>
              <div className="text-[10px] text-emerald-800 font-mono font-semibold">High Assurance</div>
            </div>

            {/* Recommended Action */}
            <div className="p-3 bg-amber-50/50 border border-amber-300 space-y-1">
              <div className="text-[10px] font-mono text-amber-950 font-bold uppercase">Recommended Action</div>
              <div className="font-mono font-bold text-xs text-amber-950 truncate">
                {formatActionShortLabel(payment.recommendedAction)}
              </div>
              <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-stone-900 text-stone-50 uppercase inline-block">
                RANK 1 OF 7
              </span>
            </div>
          </div>

          {/* Quick Rationale Callout */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] text-xs font-serif-editorial text-stone-800 leading-relaxed">
            <span className="font-bold font-mono text-[11px] text-stone-900 uppercase">Synthesis: </span>
            {payment.aiExplanation || structuredExplanation.whySelected}
          </div>
        </div>
      </div>

      {/* SECTION 4: CANDIDATE STRATEGY MATRIX (ALL 7 CANONICAL ACTIONS) */}
      <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE1]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
                Candidate Strategy Matrix (7 Canonical Actions)
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-stone-100 text-stone-800 border border-stone-300">
                ALL 7 EVALUATED
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Every canonical action is scanned against deterministic policy rules and scored by Expected Recovery Value (EV = Probability × Gross Amount).
            </p>
          </div>
          <div className="text-[11px] font-mono text-stone-500 self-start sm:self-auto">
            Click any row to select & inspect
          </div>
        </div>

        {/* 7 Canonical Actions List */}
        <div className="space-y-2.5">
          {candidateActions.map((cand, idx) => {
            const isSelected = selectedActionKey === cand.action;
            const isBlocked = cand.policyStatus === 'blocked';
            const isRec = cand.isRecommended;

            return (
              <div
                key={cand.action}
                onClick={() => setSelectedActionKey(cand.action)}
                className={`p-3.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50/50 border-stone-900 ring-2 ring-stone-900 shadow-sm'
                    : isBlocked
                    ? 'bg-[#FAF9F5] border-[#E6E2D8] opacity-65 hover:opacity-85'
                    : 'bg-[#FAF9F5] border-[#E6E2D8] hover:border-stone-400 hover:bg-white'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Index, Name, Canonical Badge, Policy Status, and Policy Notes */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-6 h-6 shrink-0 flex items-center justify-center text-xs font-mono font-bold ${
                        isRec
                          ? 'bg-stone-900 text-stone-50'
                          : isSelected
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-900">
                          {cand.label}
                        </span>
                        <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-1 py-0.2 border border-stone-300">
                          {cand.action}
                        </span>
                        {isRec && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-200 text-amber-950 border border-amber-400">
                            SELECTED STRATEGY
                          </span>
                        )}
                        <PolicyBadge status={cand.policyStatus} />
                      </div>

                      {cand.policyNotes && (
                        <p className="text-xs text-stone-600 leading-snug">
                          {cand.policyNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics (Probability, Expected Value, Policy Detail) */}
                  <div className="flex items-center gap-5 self-end md:self-auto shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-stone-500 uppercase">Probability</div>
                      <div className="font-mono font-bold text-stone-900 text-xs">
                        {formatPercent(cand.probability)}
                      </div>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <div className="text-[10px] font-mono text-emerald-800 font-semibold uppercase">Expected Value</div>
                      <div className="font-mono font-bold text-emerald-900 text-sm">
                        {formatINR(cand.expectedRecovery, { compact: false })}
                      </div>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <div className="text-[10px] font-mono text-stone-500 uppercase">Policy</div>
                      <div className="font-mono text-[11px] font-bold uppercase">
                        {cand.policyStatus === 'satisfied' ? (
                          <span className="text-emerald-800">ELIGIBLE</span>
                        ) : cand.policyStatus === 'restricted' ? (
                          <span className="text-amber-900">RESTRICTED</span>
                        ) : (
                          <span className="text-rose-900">BLOCKED</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: POLICY GUARDRAILS (4 Foundation Rules) */}
      <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#FAF9F5] border border-stone-300 text-stone-800">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
                Deterministic Policy Guardrails (4 Gates)
              </h3>
              <p className="text-xs text-stone-500">
                Non-negotiable compliance rules evaluated before financial simulation or live execution
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-900 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-300">
            SYSTEM ENFORCED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {guardrails.map((rule) => {
            const isPass = rule.status === 'passed';
            const isWarn = rule.status === 'warning';

            return (
              <div
                key={rule.id}
                className={`p-4 border text-xs space-y-2 ${
                  isPass
                    ? 'bg-[#FAF9F5] border-[#E6E2D8]'
                    : isWarn
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-rose-50/60 border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-sm">{rule.ruleName}</span>
                  </div>
                  {isPass ? (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" /> PASS
                    </span>
                  ) : isWarn ? (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-700" /> RESTRICTED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-100 text-rose-950 border border-rose-300 flex items-center gap-1">
                      <ShieldX className="w-3 h-3 text-rose-700" /> BLOCK
                    </span>
                  )}
                </div>

                <p className="text-stone-600 text-xs leading-relaxed">{rule.description}</p>
                <div className="p-2 bg-white border border-[#E6E2D8] font-mono text-[11px] text-stone-800">
                  <span className="font-bold text-stone-900">Audit Detail: </span>
                  {rule.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 6: DECISION EXPLANATION (Structured 3-Part Framework) */}
      <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-stone-900 text-stone-50">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
                Structured Decision Explanation
              </h3>
              <p className="text-xs text-stone-500">
                Post-decision evidence-based telemetry and comparative trade-off breakdown
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-700 px-2 py-0.5 border border-stone-300">
            AUDITABLE TRACE
          </span>
        </div>

        {/* Post-decision Disclaimer Banner */}
        <div className="p-3 bg-amber-50/40 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
          <div className="font-mono text-[11px] leading-relaxed">
            <span className="font-bold uppercase">Post-Decision Explanation Notice: </span>
            {structuredExplanation.engineDisclaimer}
          </div>
        </div>

        {/* Part 1: Why RecoverIQ selected this action */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-stone-900" />
            1. Why RecoverIQ Selected {formatActionShortLabel(payment.recommendedAction)}
          </h4>
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D8] text-sm text-stone-800 leading-relaxed font-serif-editorial">
            {structuredExplanation.whySelected}
          </div>
        </div>

        {/* Part 2: Important factors (Attribution Drivers) */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-stone-900" />
            2. Important Telemetry & Attribution Factors
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {structuredExplanation.importantFactors.map((fact, idx) => (
              <div key={idx} className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-500">{fact.title}</div>
                <div className="font-bold text-xs text-stone-900">{fact.value}</div>
                <p className="text-[11px] text-stone-600 leading-snug pt-1">{fact.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Part 3: Why the strongest alternatives were not selected */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-stone-900" />
            3. Why Strongest Alternative Strategies Were Not Selected
          </h4>
          <div className="space-y-2">
            {structuredExplanation.alternativesTradeoffs.map((alt) => (
              <div
                key={alt.action}
                className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">{alt.actionLabel}</span>
                    <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-1 border border-stone-200">
                      EV: {formatINR(alt.expectedValue)}
                    </span>
                  </div>
                  <p className="text-stone-600 text-xs leading-relaxed">{alt.rejectionReason}</p>
                </div>
                <span className="px-2 py-1 text-[10px] font-mono font-bold bg-stone-200 text-stone-800 shrink-0 self-start sm:self-auto">
                  DEPRIORITIZED
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 7: RECOVERY ACTION WORKBENCH (SIMULATE RECOVERY) */}
      <div className="bg-white border-2 border-stone-900 p-5 sm:p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E2D8]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold font-mono uppercase tracking-wider text-stone-900">
                Recovery Action Workbench
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-950 border border-amber-300">
                TEST MODE — NO PRODUCTION MONEY MOVEMENT
              </span>
            </div>
            <p className="text-xs text-stone-600">
              Simulate policy-verified AI recovery execution through synthetic rails and acquirer response endpoints.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {simState !== 'idle' && (
              <button
                onClick={handleResetSimulation}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6E2D8] text-xs font-mono text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Simulation</span>
              </button>
            )}

            <button
              onClick={handleSimulateRecovery}
              disabled={simState === 'pending' || activeCandidate.policyStatus === 'blocked'}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-sm ${
                activeCandidate.policyStatus === 'blocked'
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed border border-stone-300'
                  : simState === 'pending'
                  ? 'bg-stone-800 text-stone-300 cursor-wait'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-50 border border-stone-900 active:scale-[0.98]'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${simState === 'pending' ? 'animate-spin' : ''}`} />
              <span>
                {simState === 'pending'
                  ? 'SIMULATING RECOVERY...'
                  : `SIMULATE RECOVERY (${formatActionShortLabel(activeCandidate.action)})`}
              </span>
            </button>
          </div>
        </div>

        {/* Active Simulation Target Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Target Strategy</div>
            <div className="font-bold text-xs text-stone-900 mt-0.5">{activeCandidate.label}</div>
            <div className="text-[10px] font-mono text-stone-500">{activeCandidate.action}</div>
          </div>

          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Expected Recovery Value</div>
            <div className="font-mono font-bold text-emerald-900 text-xs mt-0.5">
              {formatINR(activeCandidate.expectedRecovery)}
            </div>
            <div className="text-[10px] text-stone-500 font-mono">Prob: {formatPercent(activeCandidate.probability)}</div>
          </div>

          <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Execution Mode</div>
            <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
              Synthetic Acquirer Rail
            </div>
            <div className="text-[10px] text-amber-800 font-mono font-semibold">Zero Production Risk</div>
          </div>
        </div>

        {/* Dynamic Simulation Result Card */}
        {simState !== 'idle' && (
          <div
            className={`p-4 border space-y-3 ${
              simState === 'succeeded'
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : simState === 'failed'
                ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                : 'bg-stone-50 border-stone-300 text-stone-900'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                {simState === 'pending' ? (
                  <Activity className="w-5 h-5 text-amber-600 animate-spin" />
                ) : simState === 'succeeded' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-700" />
                )}
                <div>
                  <div className="font-mono font-bold text-sm uppercase">
                    {simState === 'pending'
                      ? 'EXECUTION IN PROGRESS...'
                      : simState === 'succeeded'
                      ? 'SIMULATED RECOVERY SUCCEEDED'
                      : 'SIMULATED RECOVERY FAILED'}
                  </div>
                  <div className="text-xs text-stone-600">
                    {simState === 'pending'
                      ? 'Executing mock orchestrator call to simulated payment rail...'
                      : simState === 'succeeded'
                      ? 'Mock acquirer settlement completed with full gross recovery.'
                      : 'Mock acquirer rejected execution. Threshold criteria not met.'}
                  </div>
                </div>
              </div>

              {simState !== 'pending' && (
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-stone-500">Simulated Amount</div>
                  <div className="font-mono font-bold text-base text-stone-900">
                    {formatINR(simRecoveredAmount, { compact: false })}
                  </div>
                </div>
              )}
            </div>

            {/* Execution Metadata & Timestamp */}
            {simState !== 'pending' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
                <div>
                  <span className="text-stone-500">Simulated Tx Reference: </span>
                  <span className="font-bold text-stone-900">{simTxId}</span>
                </div>
                <div>
                  <span className="text-stone-500">Execution Timestamp: </span>
                  <span className="font-bold text-stone-900">{simTimestamp}</span>
                </div>
                <div>
                  <span className="text-stone-500">Acquirer Gateway: </span>
                  <span className="font-bold text-stone-900">RecoverIQ Mock Engine</span>
                </div>
              </div>
            )}

            {/* Terminal logs */}
            <div className="p-3 bg-stone-900 text-stone-200 font-mono text-[11px] space-y-1 rounded-none">
              <div className="text-stone-400 text-[10px] uppercase pb-1 border-b border-stone-800">
                Simulated Execution Telemetry Trace
              </div>
              {simLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 8: AUDIT REFERENCE */}
      <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-stone-500 font-bold">Audit Reference:</span>
            <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 border border-[#E6E2D8]">
              {decisionRefId}
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs font-mono text-stone-600">Policy Engine v2.4.1 (Deterministic Core)</span>
          </div>
          <p className="text-xs text-stone-600">
            Immutable snapshot recorded for payment <span className="font-mono font-semibold">{payment.id}</span>. Evaluated against active policy guardrails.
          </p>
        </div>

        <button
          onClick={handleViewAuditRecord}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-900 text-xs font-mono font-bold uppercase border border-stone-800 transition-colors shadow-sm self-start sm:self-auto shrink-0"
        >
          <span>View Decision Record</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
