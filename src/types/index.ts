export type CanonicalAction =
  | 'retry_now'
  | 'retry_later'
  | 'send_payment_link'
  | 'send_reminder'
  | 'request_payment_method_update'
  | 'escalate_to_human'
  | 'stop_recovery';

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'mandate' | 'wallet';

export type FailureReason =
  | 'insufficient_funds'
  | 'technical_glitch'
  | 'card_expired'
  | 'auth_timeout'
  | 'customer_dropoff'
  | 'mandate_invalid'
  | 'limit_exceeded';

export type PaymentStatus =
  | 'at_risk'
  | 'recovering'
  | 'recovered'
  | 'failed'
  | 'abandoned';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export type PolicyStatus = 'satisfied' | 'restricted' | 'blocked';

export type ExecutionStatus = 'pending' | 'succeeded' | 'failed' | 'scheduled' | 'skipped';

export interface CandidateAction {
  action: CanonicalAction;
  label: string;
  probability: number; // 0 to 1
  expectedRecovery: number; // in INR
  confidence: number; // 0 to 1
  isRecommended: boolean;
  policyStatus: PolicyStatus;
  policyNotes?: string;
}

export interface PolicyCheck {
  id: string;
  ruleName: string;
  description: string;
  status: 'passed' | 'warning' | 'failed';
  detail: string;
}

export interface CustomerContext {
  customerId: string;
  customerName: string;
  email: string;
  segment: 'Enterprise' | 'Growth' | 'SMB' | 'Retail';
  lifetimeValue: number; // in INR
  totalSuccessfulPayments: number;
  totalFailedPayments: number;
  historicalRecoveryRate: number; // 0 to 1
  avgRecoveryLatencyHours: number;
  retryFatigueScore: number; // 0 (none) to 10 (high)
}

export interface PaymentRecord {
  id: string; // e.g. pay_9F8aK29x
  amount: number; // in INR
  currency: 'INR';
  customer: CustomerContext;
  paymentMethod: PaymentMethod;
  paymentMethodDetails: string; // e.g. "HDFC Visa •••• 4242" or "user@okhdfcbank"
  failureReason: FailureReason;
  failureCode: string; // e.g. "ERR_INSUFFICIENT_FUNDS_51"
  failedAt: string;
  recoveryProbability: number; // 0 to 1
  expectedRecoveryValue: number; // in INR
  recommendedAction: CanonicalAction;
  priority: PriorityLevel;
  status: PaymentStatus;
  retryCount: number;
  maxRetriesAllowed: number;
  aiExplanation?: string;
  candidateActions?: CandidateAction[];
  guardrails?: PolicyCheck[];
  executionStatus?: ExecutionStatus;
  recoveredAmount?: number;
  structuredExplanation?: any;
}

export interface DecisionRecord {
  id: string; // dec_893201
  paymentId: string;
  customerName: string;
  customerSegment?: 'Enterprise' | 'Growth' | 'SMB' | 'Retail';
  amount: number;
  recoveryProbability: number;
  recommendedAction: CanonicalAction;
  actionLabel: string;
  expectedRecovery: number;
  policyStatus: PolicyStatus;
  policyChecksCount?: { passed: number; total: number };
  executionStatus: ExecutionStatus;
  recoveredAmount: number;
  modelVersion: string; // e.g. "RecoverIQ XGB-v2.4.1"
  aiExplanationSnippet: string;
  timestamp: string;
  failureReason?: FailureReason;
  failureCode?: string;
  paymentMethod?: PaymentMethod;
  paymentMethodDetails?: string;
  inputFeatures?: {
    customerLTV: number;
    historicalSuccessRate: number;
    retryCount: number;
    maxRetries: number;
    latencyHours: number;
    fatigueScore: number;
    acquirerState: string;
  };
  candidateActions?: CandidateAction[];
  guardrails?: PolicyCheck[];
  structuredExplanation?: {
    whySelected: string;
    importantFactors: string[];
    alternativeTradeoffs: string;
  };
}

export interface TimeseriesDataPoint {
  date: string;
  label: string;
  aiRecovered: number; // Cumulative or periodic recovered in INR
  baselineRecovered: number;
  revenueAtRisk: number;
}

export interface FailureReasonBreakdown {
  reason: FailureReason;
  label: string;
  revenueAtRisk: number;
  recoveredRevenue: number;
  recoveryRate: number; // 0 to 1
  caseCount: number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  label: string;
  revenueAtRisk: number;
  recoveredRevenue: number;
  recoveryRate: number;
  sharePercent: number;
}

export interface DashboardSummary {
  revenueAtRisk: number;
  predictedRecoverableRevenue: number;
  revenueRecovered: number;
  incrementalRevenue: number;
  incrementalPercentage: number;
  recoveryRate: number;
  baselineRecoveryRate: number;
  activeCasesCount: number;
  totalCasesProcessed: number;
  timeseries: TimeseriesDataPoint[];
  failureBreakdown: FailureReasonBreakdown[];
  methodBreakdown: PaymentMethodBreakdown[];
  highPriorityCases: PaymentRecord[];
  recentDecisions: DecisionRecord[];
  datasetType: 'synthetic_demo';
  lastUpdated: string;
}

export interface ScoreResponse {
  paymentId: string;
  modelVersion: string;
  baseRecoveryProbability: number;
  predictedAt: string;
  features: Record<string, any>;
}

export interface DecideResponse {
  decisionId: string;
  paymentId: string;
  modelVersion: string;
  baseRecoveryProbability: number;
  recommendedAction: CanonicalAction;
  actionLabel: string;
  expectedRecoveryValue: number;
  policyStatus: PolicyStatus;
  candidateActions: CandidateAction[];
  guardrails: PolicyCheck[];
  structuredExplanation?: any;
  aiExplanationSnippet?: string;
  timestamp: string;
}

export interface ExecuteResponse {
  actionId: string;
  decisionId: string;
  paymentId: string;
  actionType: CanonicalAction;
  executionStatus: ExecutionStatus;
  simulatedReference: string;
  recovered: boolean;
  recoveredAmount: number;
  recoveryTimeMinutes?: number;
  executionLogs?: string[];
  executedAt: string;
}

export interface MetricsResponse {
  modelVersion: string;
  evaluationSampleCount: number;
  mlMetrics: Record<string, any>;
  recoveryComparison: {
    total_cases_evaluated: number;
    revenue_at_risk: number;
    baseline: {
      strategy: string;
      recovered_cases: number;
      recovery_rate: number;
      recovered_revenue: number;
    };
    recoveriq: {
      strategy: string;
      recovered_cases: number;
      recovery_rate: number;
      recovered_revenue: number;
    };
    incremental: {
      incremental_recovered_cases: number;
      incremental_recovered_revenue: number;
      absolute_recovery_rate_improvement: number;
      relative_lift_percentage: number;
    };
  };
}
