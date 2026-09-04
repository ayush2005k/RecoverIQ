import React, { useState, useEffect } from 'react';
import { DecisionRecord } from '../../types';
import { formatINR, formatRelativeTime, formatPercent, formatDateTime, formatActionLabel } from '../../utils/formatters';
import { PolicyBadge, ExecutionBadge } from '../common/Badge';
import {
  X,
  ShieldCheck,
  Lock,
  FileCheck2,
  Copy,
  Check,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Cpu,
  Fingerprint,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  FileText,
  KeyRound,
  Database
} from 'lucide-react';

interface DecisionAuditDrawerProps {
  decision: DecisionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPayment?: (paymentId: string) => void;
}

export const DecisionAuditDrawer: React.FC<DecisionAuditDrawerProps> = ({
  decision,
  isOpen,
  onClose,
  onNavigateToPayment,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'candidates' | 'policy' | 'raw'>('overview');

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !decision) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const pseudoHash = `0x${decision.id.replace(/[^a-zA-Z0-9]/g, '').padEnd(16, '0')}${decision.paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}c48a7f2e`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-12">
        <div className="w-screen max-w-3xl bg-[#FAF9F5] border-l border-[#E6E2D8] shadow-2xl flex flex-col h-full text-stone-900 animate-in slide-in-from-right duration-300">
          {/* Immutable Record Top Bar */}
          <div className="bg-stone-900 text-stone-100 px-5 py-2.5 flex items-center justify-between text-[11px] font-mono tracking-wider uppercase border-b border-stone-800 shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-amber-400">IMMUTABLE AUDIT SNAPSHOT</span>
              <span className="text-stone-500">•</span>
              <span className="text-stone-400 hidden sm:inline">SHA-256: {pseudoHash.slice(0, 18)}...</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-stone-400 text-[10px] hidden md:inline">READ-ONLY REPOSITORY</span>
              <button
                onClick={onClose}
                className="p-1 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded transition-colors"
                title="Close Audit Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Header */}
          <div className="p-6 border-b border-[#E6E2D8] bg-white shrink-0 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono font-bold text-stone-500 uppercase">
                    DECISION AUDIT RECORD
                  </span>
                  <span className="font-mono text-sm font-bold bg-[#FAF9F5] border border-[#E6E2D8] px-2 py-0.5 text-stone-900">
                    {decision.id}
                  </span>
                  <button
                    onClick={() => handleCopy(decision.id, 'decId')}
                    className="text-stone-400 hover:text-stone-800 text-xs font-mono inline-flex items-center gap-1"
                  >
                    {copied === 'decId' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <ExecutionBadge status={decision.executionStatus} />
                </div>
                <h2 className="text-xl sm:text-2xl font-serif-editorial font-bold text-stone-900 mt-1 tracking-tight">
                  {decision.customerName}
                </h2>
              </div>

              <div className="text-right sm:self-center">
                <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                  Payment At-Risk Gross
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-stone-900">
                  {formatINR(decision.amount)}
                </div>
              </div>
            </div>

            {/* Sub-header Navigation Chips */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E6E2D8] text-xs font-mono overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-stone-900 text-stone-100'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  01. Decision Summary
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                    activeTab === 'features'
                      ? 'bg-stone-900 text-stone-100'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  02. Input Features
                </button>
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                    activeTab === 'candidates'
                      ? 'bg-stone-900 text-stone-100'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  03. Candidates & EV
                </button>
                <button
                  onClick={() => setActiveTab('policy')}
                  className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                    activeTab === 'policy'
                      ? 'bg-stone-900 text-stone-100'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  04. Policy Checks
                </button>
              </div>

              {onNavigateToPayment && (
                <button
                  onClick={() => {
                    onNavigateToPayment(decision.paymentId);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F5] border border-stone-800 text-stone-900 font-bold hover:bg-stone-100 transition-colors shrink-0"
                >
                  <span>Open Payment Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Synthetic Data Stamp */}
            <div className="bg-stone-100/80 border border-stone-300/80 px-3.5 py-2 text-[11px] font-mono text-stone-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-stone-500" />
                <span>SYNTHETIC DEMO AUDIT RECORD — SIMULATED ATTESTATION</span>
              </span>
              <span className="font-semibold text-stone-800">NO FINANCIAL LOSS</span>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 1. Decision-Time Payment Snapshot */}
                <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-stone-700" />
                      <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-stone-900">
                        1. Decision-Time Payment Snapshot
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500">
                      Captured at: {formatDateTime(decision.timestamp)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Payment ID</div>
                      <div className="font-bold text-stone-900 mt-1 flex items-center gap-1">
                        <span>{decision.paymentId}</span>
                        <button
                          onClick={() => handleCopy(decision.paymentId, 'payId')}
                          className="text-stone-400 hover:text-stone-700"
                        >
                          {copied === 'payId' ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Gross Amount</div>
                      <div className="font-bold text-stone-900 mt-1">
                        {formatINR(decision.amount)}
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Customer Tier</div>
                      <div className="font-bold text-stone-900 mt-1">
                        {decision.customerSegment || 'Enterprise'} Segment
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Payment Method & Token</div>
                      <div className="font-bold text-stone-900 mt-1 truncate">
                        {decision.paymentMethodDetails || `${decision.paymentMethod || 'mandate'} •••• 9012`}
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Decline Code</div>
                      <div className="font-bold text-rose-800 mt-1">
                        {decision.failureCode || 'ERR_INSUFFICIENT_FUNDS_51'}
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Failure Diagnostic</div>
                      <div className="font-bold text-stone-800 mt-1 capitalize">
                        {(decision.failureReason || 'insufficient_funds').replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Selected Action & Synthesis */}
                <div className="bg-white border-2 border-stone-900 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-stone-900" />
                      <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-stone-900">
                        2. AI Recovery Decision Engine Selection
                      </h3>
                    </div>
                    <PolicyBadge status={decision.policyStatus} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] font-mono text-stone-500 uppercase">Selected Strategy</div>
                      <div className="font-mono font-bold text-sm text-stone-900 mt-1">
                        {decision.actionLabel}
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] font-mono text-stone-500 uppercase">Model Recovery Probability</div>
                      <div className="font-mono font-bold text-sm text-emerald-800 mt-1">
                        {formatPercent(decision.recoveryProbability)}
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] font-mono text-stone-500 uppercase">Expected Recovery (EV)</div>
                      <div className="font-mono font-bold text-sm text-stone-900 mt-1">
                        {formatINR(decision.expectedRecovery)}
                      </div>
                    </div>
                  </div>

                  {/* Decision Explanation */}
                  <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-4 space-y-2">
                    <div className="text-[10px] font-mono font-bold uppercase text-stone-600">
                      Why RecoverIQ Selected This Action:
                    </div>
                    <p className="text-xs text-stone-800 leading-relaxed font-serif-editorial">
                      {decision.structuredExplanation?.whySelected || decision.aiExplanationSnippet}
                    </p>
                  </div>
                </div>

                {/* 3. Execution Result & Telemetry */}
                <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-stone-700" />
                      <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-stone-900">
                        3. Execution Telemetry & Result
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500">
                      Status: <strong className="uppercase text-stone-900">{decision.executionStatus}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Recovered Amount</div>
                      <div className="font-bold text-base text-stone-900 mt-1">
                        {decision.executionStatus === 'succeeded'
                          ? formatINR(decision.recoveredAmount || decision.amount)
                          : '₹0 (Pending/Scheduled)'}
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Acquirer Reference</div>
                      <div className="font-bold text-stone-900 mt-1">
                        tx_{decision.paymentId.replace('pay_', '')}_rec
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3">
                      <div className="text-[10px] text-stone-500 uppercase">Execution Latency</div>
                      <div className="font-bold text-stone-900 mt-1">
                        42ms Pipeline Latency
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Model Version & Attestation */}
                <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E6E2D8]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-800" />
                      <span className="font-bold uppercase text-stone-900">
                        4. Model Version & Attestation
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-bold">
                      VERIFIED BY RECOVERIQ CORE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-stone-500">Model Artifact: </span>
                      <span className="font-bold text-stone-900">{decision.modelVersion}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Policy Core Engine: </span>
                      <span className="font-bold text-stone-900">Deterministic Guardrails v3.1</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Execution Mode: </span>
                      <span className="font-bold text-stone-900">Policy-Verified Decision Engine</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Ledger Ingestion: </span>
                      <span className="font-bold text-stone-900">Block #948,102 (Immutable)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INPUT FEATURES */}
            {activeTab === 'features' && (
              <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-5">
                <div className="pb-3 border-b border-[#E6E2D8] flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-stone-900">
                      Input Features Matrix (Inference Snapshot)
                    </h3>
                    <p className="text-xs text-stone-600 font-serif-editorial mt-0.5">
                      Exact quantitative feature vector passed to the XGBoost scoring model at decision timestamp
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-stone-100 px-2 py-1 border border-stone-300">
                    7 Features Evaluated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3.5 space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase">Customer Lifetime Value (LTV)</div>
                    <div className="text-sm font-bold text-stone-900">
                      {formatINR(decision.inputFeatures?.customerLTV || 3840000)}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Historical gross spend across all prior settled billing periods.
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3.5 space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase">Historical Success Rate</div>
                    <div className="text-sm font-bold text-emerald-800">
                      {formatPercent(decision.inputFeatures?.historicalSuccessRate || 0.92)}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Ratio of successful billing attempts to total prior representations.
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3.5 space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase">Retry Count Consumed</div>
                    <div className="text-sm font-bold text-stone-900">
                      {decision.inputFeatures?.retryCount || 0} of {decision.inputFeatures?.maxRetries || 3} allowed
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Number of automated representation cycles exhausted for this payment cycle.
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3.5 space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase">Average Recovery Latency</div>
                    <div className="text-sm font-bold text-stone-900">
                      {decision.inputFeatures?.latencyHours || 4.5} Hours
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Typical elapsed duration between first decline and liquidity reconciliation.
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3.5 space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase">Customer Retry Fatigue Score</div>
                    <div className="text-sm font-bold text-stone-900">
                      {decision.inputFeatures?.fatigueScore || 1.2} / 10 (Low Risk)
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Metric penalizing excessive customer messaging to avoid churn.
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] border border-[#E6E2D8] p-3.5 space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase">Acquirer Telemetry & Health</div>
                    <div className="text-sm font-bold text-emerald-800">
                      {decision.inputFeatures?.acquirerState || 'Nominal (120ms latency)'}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Real-time webhook and latency probe status from issuer bank switch.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CANDIDATE ACTIONS & EXPECTED VALUES */}
            {activeTab === 'candidates' && (
              <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-5">
                <div className="pb-3 border-b border-[#E6E2D8]">
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-stone-900">
                    Candidate Strategy Space Evaluation
                  </h3>
                  <p className="text-xs text-stone-600 font-serif-editorial mt-0.5">
                    Comparative expected value (EV = Probability × Gross Amount) calculated for all 7 canonical recovery strategies
                  </p>
                </div>

                <div className="overflow-x-auto border border-[#E6E2D8]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF9F5] text-stone-600 font-mono text-[10px] uppercase border-b border-[#E6E2D8]">
                        <th className="py-2.5 px-3">Canonical Action</th>
                        <th className="py-2.5 px-3">Model Probability ($P$)</th>
                        <th className="py-2.5 px-3">Expected Value ($EV$)</th>
                        <th className="py-2.5 px-3">Policy Status</th>
                        <th className="py-2.5 px-3 text-right">Selected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE6DD] font-mono">
                      {(decision.candidateActions || []).map((cand) => {
                        const isChosen = cand.action === decision.recommendedAction || cand.isRecommended;
                        return (
                          <tr
                            key={cand.action}
                            className={`transition-colors ${
                              isChosen ? 'bg-amber-50/60 font-semibold' : 'hover:bg-[#FAF9F5]'
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-bold text-stone-900">{cand.label}</div>
                              <div className="text-[10px] text-stone-500 font-normal">{cand.policyNotes || 'Evaluated'}</div>
                            </td>
                            <td className="py-3 px-3 font-bold text-stone-800">
                              {formatPercent(cand.probability)}
                            </td>
                            <td className="py-3 px-3 font-bold text-stone-900">
                              {formatINR(cand.expectedRecovery)}
                            </td>
                            <td className="py-3 px-3">
                              <PolicyBadge status={cand.policyStatus} />
                            </td>
                            <td className="py-3 px-3 text-right">
                              {isChosen ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-900 bg-stone-900 text-stone-100 px-2 py-0.5">
                                  CHOSEN
                                </span>
                              ) : (
                                <span className="text-[11px] text-stone-400">Alternative</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: POLICY CHECKS */}
            {activeTab === 'policy' && (
              <div className="bg-white border border-[#E6E2D8] p-5 shadow-xs space-y-5">
                <div className="pb-3 border-b border-[#E6E2D8] flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-stone-900">
                      Deterministic Policy Guardrail Checks
                    </h3>
                    <p className="text-xs text-stone-600 font-serif-editorial mt-0.5">
                      4 deterministic safety gates evaluated prior to execution dispatch
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-2.5 py-1">
                    {decision.policyChecksCount?.passed || 4} / {decision.policyChecksCount?.total || 4} GATES PASSED
                  </span>
                </div>

                <div className="space-y-3">
                  {(decision.guardrails || [
                    {
                      id: 'g1',
                      ruleName: 'Retry Limit Threshold',
                      description: 'Verifies consumed retry count does not exceed regulatory limit of 3 retries per billing cycle.',
                      status: 'passed' as const,
                      detail: '0 of 3 retries consumed. Gate Status: PASS.',
                    },
                    {
                      id: 'g2',
                      ruleName: '72-Hour Recovery Window SLA',
                      description: 'Verifies elapsed duration from initial decline has not exceeded maximum autonomous recovery window.',
                      status: 'passed' as const,
                      detail: '35 minutes elapsed since decline (71.4 hours remaining). Gate Status: PASS.',
                    },
                    {
                      id: 'g3',
                      ruleName: 'Contact Frequency & Cooldown',
                      description: 'Verifies customer contact cooldown to prevent customer fatigue or churn.',
                      status: 'passed' as const,
                      detail: '0 outbound notifications sent in past 24h. Gate Status: PASS.',
                    },
                    {
                      id: 'g4',
                      ruleName: 'Payment Method Eligibility',
                      description: 'Verifies instrument token status and payment network routing availability.',
                      status: 'passed' as const,
                      detail: 'E-Mandate token active & authorized with ICICI Bank. Gate Status: PASS.',
                    },
                  ]).map((g) => (
                    <div
                      key={g.id}
                      className="border border-[#E6E2D8] bg-[#FAF9F5] p-4 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-stone-900">
                            {g.ruleName}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                            g.status === 'passed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                              : 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                          }`}>
                            {g.status === 'passed' ? 'PASS' : 'BLOCK'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 font-serif-editorial">
                          {g.description}
                        </p>
                        <div className="text-[11px] font-mono text-stone-500 pt-1">
                          {g.detail}
                        </div>
                      </div>

                      <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#E6E2D8] bg-[#FAF9F5] flex items-center justify-between gap-3 text-xs font-mono text-stone-600 shrink-0">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              <span>Immutable Ledger Hash: <span className="text-stone-900 font-semibold">{pseudoHash.slice(0, 16)}</span></span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold uppercase tracking-wider transition-colors"
            >
              Close Audit Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
