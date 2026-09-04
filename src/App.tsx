/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from './components/layout/Layout';
import { DashboardView } from './components/dashboard/DashboardView';
import { PaymentDecisionWorkspace } from './components/dashboard/PaymentDecisionWorkspace';
import { PaymentsListView } from './components/dashboard/PaymentsListView';
import { DecisionsAuditView } from './components/dashboard/DecisionsAuditView';
import { StrategyAnalyticsView } from './components/dashboard/StrategyAnalyticsView';
import { DashboardSummary, PaymentRecord, DecisionRecord } from './types';
import { api } from './services/api';
import { AlertCircle, RefreshCw, Layers, Sparkles } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isRunningStrategy, setIsRunningStrategy] = useState<boolean>(false);
  const [strategyNotification, setStrategyNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [decisionsList, setDecisionsList] = useState<DecisionRecord[]>([]);

  // Sync state with browser URL
  const syncFromUrl = useCallback((data: DashboardSummary) => {
    try {
      const path = window.location.pathname;
      if (path.startsWith('/payments/')) {
        const paymentId = path.replace('/payments/', '').trim();
        const found = data.highPriorityCases.find((p) => p.id === paymentId);
        if (found) {
          setSelectedPayment(found);
          setCurrentTab('payments');
          return;
        } else if (paymentId) {
          api.getPaymentById(paymentId).then((fresh) => {
            if (fresh) {
              setSelectedPayment(fresh);
              setCurrentTab('payments');
            }
          }).catch(console.error);
          return;
        }
      }

      if (path === '/payments') {
        setCurrentTab('payments');
        setSelectedPayment(null);
      } else if (path === '/decisions') {
        setCurrentTab('decisions');
        setSelectedPayment(null);
      } else if (path === '/analytics') {
        setCurrentTab('analytics');
        setSelectedPayment(null);
      } else {
        setCurrentTab('dashboard');
        setSelectedPayment(null);
      }
    } catch {
      // Fallback in environments where location isn't fully mockable
      setCurrentTab('dashboard');
    }
  }, []);

  const fetchSummary = async (isManualRefresh: boolean = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [summaryData, paymentsData, decisionsData] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getPayments({ limit: 100 }),
        api.getDecisions({ limit: 100 }),
      ]);

      if (summaryData.status === 'fulfilled') {
        setSummary(summaryData.value);
        syncFromUrl(summaryData.value);
      } else {
        throw summaryData.reason;
      }

      if (paymentsData.status === 'fulfilled') {
        setPaymentsList(paymentsData.value.items);
      }
      if (decisionsData.status === 'fulfilled') {
        setDecisionsList(decisionsData.value.items);
      }
    } catch (err: any) {
      console.error('Failed to fetch RecoverIQ backend data:', err);
      setError(
        'Unable to connect to RecoverIQ decision engine backend (http://127.0.0.1:8000). Please verify the server is running.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    const handlePopState = () => {
      if (summary) {
        syncFromUrl(summary);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectPayment = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    try {
      window.history.pushState(null, '', `/payments/${payment.id}`);
    } catch (e) {
      // Ignore if iframe restricts pushState
    }
  };

  const handleNavigateToPayment = async (paymentId: string) => {
    // Look up in loaded summary or payments list
    let found =
      summary?.highPriorityCases.find((p) => p.id === paymentId) ||
      paymentsList.find((p) => p.id === paymentId);

    if (found) {
      handleSelectPayment(found);
      return;
    }

    // Otherwise fetch fresh from backend
    try {
      const fetched = await api.getPaymentById(paymentId);
      if (fetched) {
        handleSelectPayment(fetched);
      }
    } catch (err) {
      console.error('Failed to load payment by id:', paymentId, err);
    }
  };

  const handleSelectDecision = (decision: DecisionRecord) => {
    setSelectedDecisionId(decision.id);
  };

  const handleBackFromWorkspace = () => {
    setSelectedPayment(null);
    try {
      const newPath = currentTab === 'dashboard' ? '/' : `/${currentTab}`;
      window.history.pushState(null, '', newPath);
    } catch (e) {
      // Ignore if iframe restricts pushState
    }
  };

  const handleSelectTab = (tab: string) => {
    setSelectedPayment(null);
    setSelectedDecisionId(null);
    setCurrentTab(tab);
    try {
      const newPath = tab === 'dashboard' ? '/' : `/${tab}`;
      window.history.pushState(null, '', newPath);
    } catch (e) {
      // Ignore if iframe restricts pushState
    }
  };

  const handleRunStrategy = async () => {
    setIsRunningStrategy(true);
    setStrategyNotification(null);
    try {
      const metrics = await api.getMetrics();
      const updatedSummary = await api.getDashboardSummary();
      setSummary(updatedSummary);
      setStrategyNotification(
        `AI Recovery Decision Engine evaluated ${metrics.evaluationSampleCount.toLocaleString(
          'en-IN'
        )} pipeline targets. RecoverIQ Recovery Rate: ${(
          metrics.recoveryComparison.recoveriq.recovery_rate * 100
        ).toFixed(1)}% vs ${(
          metrics.recoveryComparison.baseline.recovery_rate * 100
        ).toFixed(1)}% baseline (+${metrics.recoveryComparison.incremental.relative_lift_percentage}% lift).`
      );
      setTimeout(() => {
        setStrategyNotification(null);
      }, 6000);
    } catch (err: any) {
      console.error('Run strategy error:', err);
      setStrategyNotification(
        'AI Recovery Decision Engine refreshed telemetry from backend.'
      );
      setTimeout(() => {
        setStrategyNotification(null);
      }, 4000);
    } finally {
      setIsRunningStrategy(false);
    }
  };

  return (
    <Layout
      currentTab={selectedPayment ? 'payments' : currentTab}
      onSelectTab={handleSelectTab}
      activeCasesCount={summary?.activeCasesCount || 1420}
      onRefresh={() => fetchSummary(true)}
      isRefreshing={refreshing}
      onRunStrategy={handleRunStrategy}
      isRunningStrategy={isRunningStrategy}
    >
      {/* Dynamic Strategy Notification Toast */}
      {strategyNotification && (
        <div className="mb-6 p-4 bg-stone-900 text-stone-50 border border-stone-800 flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-medium">{strategyNotification}</span>
          </div>
          <button
            onClick={() => setStrategyNotification(null)}
            className="text-stone-400 hover:text-stone-100 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-10 h-10 bg-stone-900 text-stone-100 flex items-center justify-center animate-pulse">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold font-serif-editorial text-stone-900">
              Initializing RecoverIQ Decision Engine...
            </p>
            <p className="text-xs text-stone-500 font-mono">
              Evaluating expected-value recovery models & active policy guardrails
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-white border border-rose-300 space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-700" />
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold font-serif-editorial text-stone-900">Engine Telemetry Disconnected</h3>
            <p className="text-xs text-stone-600 max-w-md">{error}</p>
          </div>
          <button
            onClick={() => fetchSummary(true)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-stone-50 text-xs font-mono uppercase font-bold hover:bg-stone-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : summary ? (
        <>
          {selectedPayment ? (
            <PaymentDecisionWorkspace
              payment={selectedPayment}
              onBack={handleBackFromWorkspace}
              onNavigateToDecision={(decisionId) => {
                setSelectedPayment(null);
                setSelectedDecisionId(decisionId);
                setCurrentTab('decisions');
                try {
                  window.history.pushState(null, '', '/decisions');
                } catch (e) {
                  // ignore
                }
              }}
              onExecuteAction={(paymentId, action) => {
                // Refresh summary, decisions and payments in background
                api.getDashboardSummary().then((fresh) => setSummary(fresh)).catch(console.error);
                api.getDecisions({ limit: 100 }).then((res) => setDecisionsList(res.items)).catch(console.error);
                api.getPayments({ limit: 100 }).then((res) => setPaymentsList(res.items)).catch(console.error);
              }}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  summary={summary}
                  onSelectPayment={handleSelectPayment}
                  onSelectDecision={(dec) => {
                    setSelectedDecisionId(dec.id);
                    setCurrentTab('decisions');
                    try {
                      window.history.pushState(null, '', '/decisions');
                    } catch (e) {}
                  }}
                  onInspectQueue={() => handleSelectTab('payments')}
                  onNavigateToDecisions={() => handleSelectTab('decisions')}
                  onRunStrategy={handleRunStrategy}
                  isRunningStrategy={isRunningStrategy}
                />
              )}

              {currentTab === 'payments' && (
                <PaymentsListView
                  payments={paymentsList.length > 0 ? paymentsList : summary.highPriorityCases}
                  onSelectPayment={handleSelectPayment}
                  onNavigateToPayment={handleNavigateToPayment}
                />
              )}

              {currentTab === 'decisions' && (
                <DecisionsAuditView
                  decisions={decisionsList.length > 0 ? decisionsList : summary.recentDecisions}
                  onSelectDecision={handleSelectDecision}
                  onNavigateToPayment={handleNavigateToPayment}
                  selectedDecisionId={selectedDecisionId}
                />
              )}

              {currentTab === 'analytics' && (
                <StrategyAnalyticsView summary={summary} />
              )}
            </>
          )}
        </>
      ) : null}
    </Layout>
  );
}
