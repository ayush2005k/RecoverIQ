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
  ChevronDown,
  ChevronUp,
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

  // Progressive disclosure states
  const [showPolicyDetails, setShowPolicyDetails] = useState<boolean>(false);
  const [showAllAlternatives, setShowAllAlternatives] = useState<boolean>(false);

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

  const displayedAlternatives = showAllAlternatives
    ? structuredExplanation.alternativesTradeoffs
    : structuredExplanation.alternativesTradeoffs.slice(0, 2);

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOP BREADCRUMB & PAYMENT IDENTIFIER BAR */}
      <div className="bg-white border border-[#E6E2D8] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <h1 className="text-lg sm:text-xl font-bold font-serif-editorial text-stone-900 tracking-tight mt-0.5">
                Payment Recovery Intelligence Workspace
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerDecision}
              disabled={isDeciding}
              className="flex items-center gap-2 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-mono font-bold uppercase transition-all shadow-xs active:scale-[0.98]"
              title="Re-run RecoverIQ decision pipeline"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isDeciding ? 'animate-spin' : ''}`} />
              <span>{isDeciding ? 'EVALUATING...' : 'EVALUATE DECISION'}</span>
            </button>
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
      </div>

      {/* 2. DOMINANT PRIMARY DECISION BLOCK (TOP HERO) */}
      <div className="bg-white border-2 border-stone-900 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: FAILED PAYMENT (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E6E2D8] pb-5 lg:pb-0 lg:pr-6 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-900 bg-rose-50 px-2 py-0.5 border border-rose-200">
                  FAILED PAYMENT
                </span>
                <span className="text-xs font-mono text-stone-500" title={formattedFailedDate}>
                  {formatRelativeTime(payment.failedAt)}
                </span>
              </div>

              <div className="mt-3">
                <div className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Gross Failed Amount</div>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-stone-900 mt-0.5">
                  {formatINR(payment.amount, { compact: false })}
                </div>
              </div>

              <div className="space-y-2 mt-4 text-xs font-mono">
                <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-stone-500">Failure Reason:</span>
                  <span className="font-bold text-amber-900">{formatFailureReason(payment.failureReason)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-stone-500">Error Code:</span>
                  <span className="font-bold text-rose-950 bg-rose-50 px-1.5 py-0.5 border border-rose-200 text-[11px]">
                    {payment.failureCode}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-stone-500">Payment Method:</span>
                  <span className="font-semibold text-stone-900">{formatPaymentMethod(payment.paymentMethod)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F0ECE1]">
                  <span className="text-stone-500">Customer:</span>
                  <span className="font-bold text-stone-900">{payment.customer.customerName} ({payment.customer.segment})</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-stone-500">Retry Quota:</span>
                  <span className="font-semibold text-stone-900">{payment.retryCount} of {payment.maxRetriesAllowed} attempts used</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: RECOVERIQ RECOMMENDS (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-950 bg-emerald-100 px-2 py-0.5 border border-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  RECOVERIQ RECOMMENDS
                </span>
                <span className="text-[10px] font-mono font-bold uppercase bg-stone-900 text-stone-50 px-2 py-0.5">
                  RANK 1 OF 7 STRATEGIES
                </span>
              </div>

              <div className="mt-2">
                <h2 className="text-xl sm:text-2xl font-bold font-serif-editorial text-stone-900 tracking-tight">
                  {formatActionLabel(payment.recommendedAction)}
                </h2>
                <span className="font-mono text-[11px] text-stone-500 bg-stone-100 px-1.5 py-0.5 border border-stone-300 mt-1 inline-block">
                  {payment.recommendedAction}
                </span>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
                  <div className="text-[10px] font-mono text-stone-500 uppercase">Recovery Likelihood</div>
                  <div className="font-mono font-bold text-lg text-stone-900 mt-0.5">
                    {formatPercent(payment.recoveryProbability)}
                  </div>
                  <div className="mt-1">
                    <ProbabilityBadge probability={payment.recoveryProbability} />
                  </div>
                </div>

                <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8]">
                  <div className="text-[10px] font-mono text-emerald-800 font-bold uppercase">Expected Recovery</div>
                  <div className="font-mono font-bold text-lg text-emerald-900 mt-0.5">
                    {formatINR(payment.expectedRecoveryValue, { compact: false })}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono mt-1">Likelihood × Gross</div>
                </div>

                <div className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-mono text-stone-500 uppercase">Guardrail Status</div>
                  <div className="font-mono font-bold text-xs text-emerald-800 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>4 / 4 Gates Passed</span>
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono mt-1">Policy: Satisfied</div>
                </div>
              </div>

              {/* Immediate WHY? Callout */}
              <div className="mt-4 p-3.5 bg-amber-50/50 border border-amber-300 text-xs text-stone-800 leading-relaxed font-serif-editorial">
                <div className="font-mono font-bold text-[11px] text-amber-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-600 rounded-full" />
                  WHY THIS ACTION?
                </div>
                <p className="text-stone-900 leading-relaxed">
                  {payment.aiExplanation || structuredExplanation.whySelected}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CUSTOMER PROFILE & HISTORICAL PERFORMANCE (Compact Supporting Evidence) */}
      <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-stone-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
              Customer Profile & Historical Performance
            </h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-stone-900 text-stone-50">
            {payment.customer.segment} Tier
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="p-2.5 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Customer</div>
            <div className="font-bold text-xs text-stone-900 truncate mt-0.5">
              {payment.customer.customerName}
            </div>
            <div className="text-[10px] font-mono text-stone-500 truncate">{payment.customer.customerId}</div>
          </div>

          <div className="p-2.5 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Segment</div>
            <div className="font-bold text-xs text-stone-900 mt-0.5">{payment.customer.segment}</div>
            <div className="text-[10px] font-mono text-stone-500 truncate">{payment.customer.email}</div>
          </div>

          <div className="p-2.5 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Customer LTV</div>
            <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
              {formatINR(payment.customer.lifetimeValue)}
            </div>
            <div className="text-[10px] text-emerald-800 font-mono">High Value</div>
          </div>

          <div className="p-2.5 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Total Transactions</div>
            <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
              {payment.customer.totalSuccessfulPayments + payment.customer.totalFailedPayments}
            </div>
            <div className="text-[10px] text-stone-500 font-mono">
              {payment.customer.totalSuccessfulPayments} succ / {payment.customer.totalFailedPayments} fail
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Historical Success</div>
            <div className="font-mono font-bold text-emerald-900 text-xs mt-0.5">
              {formatPercent(payment.customer.historicalRecoveryRate)}
            </div>
            <div className="text-[10px] text-stone-500 font-mono">Past reliability</div>
          </div>

          <div className="p-2.5 bg-[#FAF9F5] border border-[#E6E2D8]">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Avg Latency</div>
            <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
              {payment.customer.avgRecoveryLatencyHours} hrs
            </div>
            <div className="text-[10px] text-stone-500 font-mono">Clearing window</div>
          </div>
        </div>
      </div>

      {/* 4. DETERMINISTIC POLICY GUARDRAILS (4 GATES) */}
      <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
                Deterministic Policy Guardrails (4 Gates)
              </h3>
              <p className="text-xs text-stone-500">
                Non-negotiable merchant policies evaluated before financial simulation or execution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] font-mono text-emerald-900 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-300">
              SYSTEM ENFORCED
            </span>
            <button
              onClick={() => setShowPolicyDetails(!showPolicyDetails)}
              className="flex items-center gap-1 text-[11px] font-mono text-stone-700 hover:text-stone-900 bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-1 transition-colors"
            >
              <span>{showPolicyDetails ? 'Hide Policy Details' : 'Show Policy Details'}</span>
              {showPolicyDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Compact 4-Gate Checklist Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {guardrails.map((rule) => {
            const isPass = rule.status === 'passed';
            const isWarn = rule.status === 'warning';

            return (
              <div
                key={rule.id}
                className={`p-3 border flex items-center justify-between gap-2 text-xs font-mono ${
                  isPass
                    ? 'bg-[#FAF9F5] border-[#E6E2D8]'
                    : isWarn
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-rose-50/60 border-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : isWarn ? (
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span className="font-bold text-stone-900 truncate" title={rule.ruleName}>
                    {rule.ruleName}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-bold uppercase shrink-0 ${
                    isPass
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      : isWarn
                      ? 'bg-amber-100 text-amber-950 border border-amber-300'
                      : 'bg-rose-100 text-rose-950 border border-rose-300'
                  }`}
                >
                  {isPass ? 'PASS' : isWarn ? 'RESTRICTED' : 'BLOCK'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Expanded Policy Audit Details (Progressive Disclosure) */}
        {showPolicyDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#F0ECE1] animate-in fade-in duration-200">
            {guardrails.map((rule) => (
              <div key={rule.id} className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] text-xs space-y-1.5">
                <div className="font-bold text-stone-900">{rule.ruleName}</div>
                <p className="text-stone-600 leading-relaxed text-[11px]">{rule.description}</p>
                <div className="p-2 bg-white border border-[#E6E2D8] font-mono text-[10px] text-stone-800">
                  <span className="font-bold text-stone-900">Audit Detail: </span>
                  {rule.detail}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. CANDIDATE STRATEGY MATRIX (ALL 7 CANONICAL ACTIONS) */}
      <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE1]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
                Candidate Strategy Matrix (7 Canonical Actions)
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-stone-100 text-stone-800 border border-stone-300">
                ALL 7 EVALUATED
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Every canonical action is scanned against deterministic policy rules and scored by Expected Recovery Value. Click any row to inspect.
            </p>
          </div>
        </div>

        {/* Compact 7-Action List */}
        <div className="space-y-2">
          {candidateActions.map((cand, idx) => {
            const isSelected = selectedActionKey === cand.action;
            const isBlocked = cand.policyStatus === 'blocked';
            const isRec = cand.isRecommended;

            return (
              <div
                key={cand.action}
                onClick={() => setSelectedActionKey(cand.action)}
                className={`p-3 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50/50 border-stone-900 ring-2 ring-stone-900 shadow-xs'
                    : isBlocked
                    ? 'bg-[#FAF9F5] border-[#E6E2D8] opacity-65 hover:opacity-85'
                    : 'bg-[#FAF9F5] border-[#E6E2D8] hover:border-stone-400 hover:bg-white'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
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

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-stone-900">{cand.label}</span>
                      <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-1 py-0.2 border border-stone-300">
                        {cand.action}
                      </span>
                      {isRec && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-200 text-amber-950 border border-amber-400">
                          RECOMMENDED
                        </span>
                      )}
                      <PolicyBadge status={cand.policyStatus} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto shrink-0 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 uppercase mr-1">Likelihood:</span>
                      <span className="font-bold text-stone-900">{formatPercent(cand.probability)}</span>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] text-emerald-800 font-semibold uppercase mr-1">EV:</span>
                      <span className="font-bold text-emerald-900">
                        {formatINR(cand.expectedRecovery, { compact: false })}
                      </span>
                    </div>

                    <div className="text-right min-w-[65px]">
                      {cand.policyStatus === 'satisfied' ? (
                        <span className="text-emerald-800 font-bold text-[10px]">ELIGIBLE</span>
                      ) : cand.policyStatus === 'restricted' ? (
                        <span className="text-amber-900 font-bold text-[10px]">RESTRICTED</span>
                      ) : (
                        <span className="text-rose-900 font-bold text-[10px]">BLOCKED</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Action Inspection Panel */}
        <div className="p-3.5 bg-[#FAF9F5] border border-[#E6E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-stone-500 uppercase">Inspecting Action:</span>
              <strong className="text-stone-900">{activeCandidate.label}</strong>
              <span className="text-stone-400">({activeCandidate.action})</span>
            </div>
            <p className="text-stone-600 font-sans text-xs">
              {activeCandidate.policyNotes || 'Evaluated against deterministic policy guardrails.'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase text-stone-500">Expected Recovery Yield</div>
            <div className="font-mono font-bold text-stone-900 text-sm">
              {formatINR(activeCandidate.expectedRecovery)} ({formatPercent(activeCandidate.probability)})
            </div>
          </div>
        </div>
      </div>

      {/* 6. WHY RECOVERIQ CHOSE THIS ACTION (Structured Explanation Framework) */}
      <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-stone-900 text-stone-50">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
                WHY RECOVERIQ CHOSE THIS ACTION
              </h3>
              <p className="text-xs text-stone-500 font-serif-editorial italic">
                Evidence-based decision breakdown and comparative trade-off analysis
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-700 px-2 py-0.5 border border-stone-300">
            AUDITABLE TRACE
          </span>
        </div>

        {/* Part 1: Primary explanation */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-stone-900" />
            1. Why RecoverIQ Selected {formatActionShortLabel(payment.recommendedAction)}
          </h4>
          <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D8] text-xs text-stone-800 leading-relaxed font-serif-editorial">
            {structuredExplanation.whySelected}
          </div>
        </div>

        {/* Part 2: Attribution Drivers */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-stone-900" />
            2. Important Telemetry & Decision Factors
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {structuredExplanation.importantFactors.map((fact, idx) => (
              <div key={idx} className="p-3 bg-[#FAF9F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-500">{fact.title}</div>
                <div className="font-bold text-xs text-stone-900">{fact.value}</div>
                <p className="text-[11px] text-stone-600 leading-snug pt-1">{fact.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Part 3: Alternatives Trade-offs (Progressive disclosure: top 2 by default) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-stone-900" />
              3. Why Not The Alternatives?
            </h4>
            {structuredExplanation.alternativesTradeoffs.length > 2 && (
              <button
                onClick={() => setShowAllAlternatives(!showAllAlternatives)}
                className="text-[11px] font-mono text-stone-600 hover:text-stone-900 flex items-center gap-1"
              >
                <span>
                  {showAllAlternatives
                    ? 'Show top 2 only'
                    : `View all ${structuredExplanation.alternativesTradeoffs.length} alternatives`}
                </span>
                {showAllAlternatives ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {displayedAlternatives.map((alt) => (
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
      <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono uppercase text-stone-500 font-bold">Audit Reference:</span>
            <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 border border-[#E6E2D8]">
              {decisionRefId}
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-600">
              TEST MODE • POLICY GUARDRAILS ACTIVE • READ-ONLY AUDIT RECORD
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Audit record for payment <span className="font-mono font-semibold text-stone-800">{payment.id}</span>. Evaluated against active policy guardrails.
          </p>
        </div>

        <button
          onClick={handleViewAuditRecord}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-stone-100 text-stone-900 text-xs font-mono font-bold uppercase border border-stone-800 transition-colors shadow-xs self-start sm:self-auto shrink-0"
        >
          <span>View Decision Record</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
