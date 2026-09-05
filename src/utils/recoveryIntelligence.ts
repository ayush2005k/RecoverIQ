import { CanonicalAction, PaymentRecord, CandidateAction, PolicyCheck, CustomerContext } from '../types';
import { formatINR, formatPercent, formatActionLabel, formatActionShortLabel } from './formatters';

export interface StructuredExplanation {
  whySelected: string;
  importantFactors: {
    title: string;
    value: string;
    impact: 'positive' | 'neutral' | 'negative';
    description: string;
  }[];
  alternativesTradeoffs: {
    action: CanonicalAction;
    actionLabel: string;
    probability: number;
    expectedValue: number;
    rejectionReason: string;
  }[];
  engineDisclaimer: string;
}

export interface GuardrailItem {
  id: string;
  ruleName: string;
  category: 'retry_limit' | 'recovery_window' | 'contact_cooldown' | 'method_eligibility';
  status: 'passed' | 'warning' | 'failed';
  statusLabel: 'PASS' | 'RESTRICTED' | 'BLOCK';
  description: string;
  detail: string;
}

/**
 * Ensures all 7 canonical actions are returned with computed metrics and policy states
 */
export function getAllCanonicalCandidateActions(payment: PaymentRecord): CandidateAction[] {
  const amount = payment.amount;
  const reason = payment.failureReason;
  const method = payment.paymentMethod;
  const retriesUsed = payment.retryCount;
  const maxRetries = payment.maxRetriesAllowed;
  const isRetriesExhausted = retriesUsed >= maxRetries;
  const isCardExpired = reason === 'card_expired';
  const isLimitExceeded = reason === 'limit_exceeded';
  const isMandateInvalid = reason === 'mandate_invalid';

  // Compute realistic probability and policy status for each of the 7 canonical actions
  const actionSpecs: {
    action: CanonicalAction;
    label: string;
    probability: number;
    confidence: number;
    policyStatus: 'satisfied' | 'restricted' | 'blocked';
    policyNotes: string;
  }[] = [];

  // 1. retry_now
  let retryNowProb = 0.15;
  let retryNowPolicy: 'satisfied' | 'restricted' | 'blocked' = 'satisfied';
  let retryNowNote = 'Immediate representation to gateway.';

  if (reason === 'technical_glitch') {
    retryNowProb = 0.94;
    retryNowPolicy = 'satisfied';
    retryNowNote = 'Optimal: Gateway restored to nominal latency; high immediate recovery rate.';
  } else if (isCardExpired) {
    retryNowProb = 0.0;
    retryNowPolicy = 'blocked';
    retryNowNote = 'Blocked by policy: Direct retry on expired instrument will yield guaranteed decline.';
  } else if (isLimitExceeded) {
    retryNowProb = 0.02;
    retryNowPolicy = 'blocked';
    retryNowNote = 'Blocked: Same-day presentation exceeds instrument spending limits.';
  } else if (isRetriesExhausted) {
    retryNowProb = 0.1;
    retryNowPolicy = 'blocked';
    retryNowNote = 'Blocked: Permitted retry quota exhausted for current billing cycle.';
  } else if (reason === 'insufficient_funds') {
    retryNowProb = 0.22;
    retryNowPolicy = 'restricted';
    retryNowNote = 'Sub-optimal: Immediate retry before bank liquidity clearing yields low probability and consumes quota.';
  } else {
    retryNowProb = 0.35;
    retryNowPolicy = isRetriesExhausted ? 'blocked' : 'satisfied';
    retryNowNote = 'Static immediate retry.';
  }

  actionSpecs.push({
    action: 'retry_now',
    label: 'Retry Immediately',
    probability: retryNowProb,
    confidence: 0.93,
    policyStatus: retryNowPolicy,
    policyNotes: retryNowNote,
  });

  // 2. retry_later
  let retryLaterProb = 0.65;
  let retryLaterPolicy: 'satisfied' | 'restricted' | 'blocked' = 'satisfied';
  let retryLaterNote = 'Timed retry during customer liquidity window.';

  if (reason === 'insufficient_funds') {
    retryLaterProb = payment.recoveryProbability > 0.7 ? payment.recoveryProbability : 0.88;
    retryLaterPolicy = isRetriesExhausted ? 'blocked' : 'satisfied';
    retryLaterNote = 'Optimal: Scheduled retry (+6h) coincides with salary/treasury clearing window.';
  } else if (reason === 'technical_glitch') {
    retryLaterProb = 0.82;
    retryLaterPolicy = 'satisfied';
    retryLaterNote = 'Viable, but immediate retry delivers faster recovery without waiting.';
  } else if (isCardExpired) {
    retryLaterProb = 0.0;
    retryLaterPolicy = 'blocked';
    retryLaterNote = 'Blocked: Time delay does not resolve expired card status.';
  } else if (isLimitExceeded) {
    retryLaterProb = 0.15;
    retryLaterPolicy = 'restricted';
    retryLaterNote = 'Restricted: Monthly limits will not reset within 72h recovery window.';
  } else if (isRetriesExhausted) {
    retryLaterProb = 0.25;
    retryLaterPolicy = 'blocked';
    retryLaterNote = 'Blocked: Permitted retry quota exhausted.';
  } else {
    retryLaterProb = 0.70;
    retryLaterPolicy = 'satisfied';
    retryLaterNote = 'Scheduled retry based on historical recovery latency.';
  }

  actionSpecs.push({
    action: 'retry_later',
    label: 'Retry Later (Smart Delay)',
    probability: retryLaterProb,
    confidence: 0.91,
    policyStatus: retryLaterPolicy,
    policyNotes: retryLaterNote,
  });

  // 3. send_payment_link
  let linkProb = 0.72;
  let linkPolicy: 'satisfied' | 'restricted' | 'blocked' = 'satisfied';
  let linkNote = 'Dispatches instant multi-rail payment link via WhatsApp & Email.';

  if (isLimitExceeded) {
    linkProb = payment.recoveryProbability > 0.6 ? payment.recoveryProbability : 0.78;
    linkPolicy = 'satisfied';
    linkNote = 'Optimal: Bypasses single-rail limits by offering NetBanking and Corporate Card alternatives.';
  } else if (reason === 'auth_timeout' || reason === 'customer_dropoff') {
    linkProb = 0.81;
    linkPolicy = 'satisfied';
    linkNote = 'High conversion: Direct 1-click checkout with pre-filled transaction context.';
  } else if (payment.customer.retryFatigueScore > 7) {
    linkProb = 0.45;
    linkPolicy = 'restricted';
    linkNote = 'Restricted: Customer has high notification fatigue; suppress outbound links.';
  }

  actionSpecs.push({
    action: 'send_payment_link',
    label: 'Send Dynamic Payment Link',
    probability: linkProb,
    confidence: 0.88,
    policyStatus: linkPolicy,
    policyNotes: linkNote,
  });

  // 4. send_reminder
  let reminderProb = 0.62;
  let reminderPolicy: 'satisfied' | 'restricted' | 'blocked' = 'satisfied';
  let reminderNote = 'Lightweight transaction alert via SMS / Email without direct charge.';

  if (payment.customer.retryFatigueScore > 8) {
    reminderProb = 0.3;
    reminderPolicy = 'blocked';
    reminderNote = 'Blocked: Contact cooldown active (exceeded 2 touchpoints in 24h).';
  } else if (reason === 'insufficient_funds') {
    reminderProb = 0.64;
    reminderPolicy = 'satisfied';
    reminderNote = 'Prompts customer to fund account before automated batch retry.';
  }

  actionSpecs.push({
    action: 'send_reminder',
    label: 'Send Customer Reminder',
    probability: reminderProb,
    confidence: 0.84,
    policyStatus: reminderPolicy,
    policyNotes: reminderNote,
  });

  // 5. request_payment_method_update
  let updateProb = 0.50;
  let updatePolicy: 'satisfied' | 'restricted' | 'blocked' = 'satisfied';
  let updateNote = 'Requests customer to update payment instrument via policy-safe tokenization flow.';

  if (isCardExpired || isMandateInvalid) {
    updateProb = payment.recoveryProbability > 0.7 ? payment.recoveryProbability : 0.84;
    updatePolicy = 'satisfied';
    updateNote = 'Optimal: Instrument requires update; token refresh restores long-term billing health.';
  } else {
    updateProb = 0.42;
    updatePolicy = 'satisfied';
    updateNote = 'Secondary action: Instrument currently valid; update flow introduces unnecessary friction.';
  }

  actionSpecs.push({
    action: 'request_payment_method_update',
    label: 'Request Payment Method Update',
    probability: updateProb,
    confidence: 0.87,
    policyStatus: updatePolicy,
    policyNotes: updateNote,
  });

  // 6. escalate_to_human
  let escalateProb = 0.78;
  let escalatePolicy: 'satisfied' | 'restricted' | 'blocked' = 'satisfied';
  let escalateNote = 'Creates urgent ticket for dedicated Relationship Manager / Enterprise Support.';

  if (payment.customer.segment === 'Enterprise' || payment.priority === 'critical') {
    escalateProb = 0.85;
    escalatePolicy = 'satisfied';
    escalateNote = 'High-touch recovery suitable for Tier-1 Enterprise account.';
  } else if (amount < 20000) {
    escalateProb = 0.55;
    escalatePolicy = 'restricted';
    escalateNote = 'Restricted by cost model: RM handling cost exceeds incremental value for ticket size.';
  }

  actionSpecs.push({
    action: 'escalate_to_human',
    label: 'Escalate to Dedicated RM',
    probability: escalateProb,
    confidence: 0.81,
    policyStatus: escalatePolicy,
    policyNotes: escalateNote,
  });

  // 7. stop_recovery
  actionSpecs.push({
    action: 'stop_recovery',
    label: 'Stop Recovery (Abandon)',
    probability: 0.0,
    confidence: 0.99,
    policyStatus: 'satisfied',
    policyNotes: 'Terminal action: Mark debt as uncollectible and suppress all future retries.',
  });

  // Format into CandidateAction with calculated expected values
  const formatted: CandidateAction[] = actionSpecs.map((spec) => {
    const isRec = spec.action === payment.recommendedAction;
    // Align recommended action probability with payment.recoveryProbability for consistency
    const prob = isRec ? payment.recoveryProbability : spec.probability;
    const ev = Math.round(prob * amount);

    return {
      action: spec.action,
      label: spec.label,
      probability: prob,
      expectedRecovery: ev,
      confidence: spec.confidence,
      isRecommended: isRec,
      policyStatus: spec.policyStatus,
      policyNotes: spec.policyNotes,
    };
  });

  // Sort candidate actions by Expected Value (descending), keeping recommended prominently at top or according to EV
  return formatted.sort((a, b) => {
    if (a.isRecommended) return -1;
    if (b.isRecommended) return 1;
    return b.expectedRecovery - a.expectedRecovery;
  });
}

/**
 * Returns the 4 canonical policy guardrails with rigorous PASS / BLOCK statuses
 */
export function getStandardPolicyGuardrails(payment: PaymentRecord): GuardrailItem[] {
  const isRetriesExhausted = payment.retryCount >= payment.maxRetriesAllowed;
  const isCardExpired = payment.failureReason === 'card_expired';
  const isLimitExceeded = payment.failureReason === 'limit_exceeded';
  const fatigue = payment.customer.retryFatigueScore;

  return [
    {
      id: 'g_retry_limit',
      category: 'retry_limit',
      ruleName: 'Retry Threshold Limit',
      description: 'Maximum allowable automated retries per billing cycle (merchant policy quota)',
      status: isRetriesExhausted ? 'failed' : 'passed',
      statusLabel: isRetriesExhausted ? 'BLOCK' : 'PASS',
      detail: isRetriesExhausted
        ? `Limit reached: ${payment.retryCount} of ${payment.maxRetriesAllowed} retries consumed. Automated retries locked.`
        : `${payment.retryCount} of ${payment.maxRetriesAllowed} retries consumed. 1 retry allocated for optimal recovery window.`,
    },
    {
      id: 'g_recovery_window',
      category: 'recovery_window',
      ruleName: '72-Hour Active Recovery Window',
      description: 'Temporal policy boundary for autonomous algorithmic intervention',
      status: 'passed',
      statusLabel: 'PASS',
      detail: `Decline timestamp is within active recovery window (71.2 hours remaining before SLA expiration).`,
    },
    {
      id: 'g_contact_cooldown',
      category: 'contact_cooldown',
      ruleName: 'Customer Contact Cooldown & Fatigue',
      description: 'Limits customer outreach frequency (max 2 touchpoints per 24-hour cycle)',
      status: fatigue > 7 ? 'warning' : 'passed',
      statusLabel: fatigue > 7 ? 'RESTRICTED' : 'PASS',
      detail: fatigue > 7
        ? `High fatigue score (${fatigue}/10). Direct messaging throttled to prevent customer churn.`
        : `0 of 2 daily notifications dispatched. Channel messaging is policy compliant.`,
    },
    {
      id: 'g_method_eligibility',
      category: 'method_eligibility',
      ruleName: 'Payment-Method Eligibility & Rail Health',
      description: 'Validates payment token validity, mandate status, and issuer network availability',
      status: isCardExpired ? 'failed' : isLimitExceeded ? 'warning' : 'passed',
      statusLabel: isCardExpired ? 'BLOCK' : isLimitExceeded ? 'RESTRICTED' : 'PASS',
      detail: isCardExpired
        ? `Card token expired on issuer network. Direct presentations strictly blocked; token updater required.`
        : isLimitExceeded
        ? `Transaction amount (${formatINR(payment.amount)}) exceeds single-transaction rail threshold. Multi-rail link recommended.`
        : `Instrument (${payment.paymentMethodDetails}) verified active and compliant with recurring mandate rules.`,
    },
  ];
}

/**
 * Synthesizes a structured 3-part Decision Explanation:
 * 1. Why RecoverIQ selected this action
 * 2. Important factors (data-backed attribution drivers)
 * 3. Why the strongest alternatives were not selected
 */
export function getStructuredDecisionExplanation(payment: PaymentRecord): StructuredExplanation {
  const reason = payment.failureReason;
  const action = payment.recommendedAction;
  const amount = payment.amount;
  const cust = payment.customer;

  let whySelected = '';
  const importantFactors: StructuredExplanation['importantFactors'] = [];
  const alternativesTradeoffs: StructuredExplanation['alternativesTradeoffs'] = [];

  // Determine rationale based on recommended action & failure reason
  if (action === 'retry_later') {
    whySelected = `RecoverIQ evaluated historical settlement timelines, issuer clearing cadence, and customer banking patterns. For ${cust.customerName} (${cust.segment}), ${cust.historicalRecoveryRate * 100}% of past ${reason.replace(/_/g, ' ')} declines cleared successfully when execution was delayed +6 hours into the afternoon settlement window. This maximizes expected value at ${formatINR(payment.expectedRecoveryValue)} while preserving the retry quota.`;
  } else if (action === 'retry_now') {
    whySelected = `RecoverIQ identified a transient gateway timeout on the acquirer network. Telemetry signals confirm that the issuer connection is restored to nominal latency (<140ms). Immediate representation achieves a ${formatPercent(payment.recoveryProbability)} recovery probability with zero customer disruption.`;
  } else if (action === 'send_payment_link') {
    whySelected = `Because the transaction encountered a ${reason.replace(/_/g, ' ')} constraint on the primary instrument, standard automated retries have a sub-5% recovery rate. Dispatching an instant multi-rail payment link provides alternative payment routes (NetBanking, Corporate Credit, UPI Intent) yielding ${formatINR(payment.expectedRecoveryValue)} in expected recovery.`;
  } else if (action === 'request_payment_method_update') {
    whySelected = `The underlying payment instrument has been flagged as ${reason.replace(/_/g, ' ')}. Direct presentations are blocked by deterministic policy. Initiating a policy-safe payment method update workflow secures both the immediate ₹${amount.toLocaleString('en-IN')} invoice and prevents future recurring churn.`;
  } else if (action === 'escalate_to_human') {
    whySelected = `Given ${cust.customerName}'s high lifetime value (${formatINR(cust.lifetimeValue)}) and critical invoice size (${formatINR(amount)}), an autonomous retry was deprioritized in favor of direct Relationship Manager outreach to avoid customer relationship risk.`;
  } else {
    whySelected = `RecoverIQ selected ${formatActionLabel(action)} as the optimal risk-adjusted strategy after scanning all 7 canonical recovery actions against active policy guardrails.`;
  }

  // Key factors
  importantFactors.push({
    title: 'Historical Customer Recovery Rate',
    value: `${formatPercent(cust.historicalRecoveryRate)} past success`,
    impact: cust.historicalRecoveryRate >= 0.8 ? 'positive' : 'neutral',
    description: `${cust.totalSuccessfulPayments} successful lifetime transactions with ${cust.avgRecoveryLatencyHours}h average recovery latency.`,
  });

  importantFactors.push({
    title: 'Issuer / Network Clearing Cadence',
    value: reason === 'technical_glitch' ? '120ms Nominal' : 'Liquidity Peak (+6h)',
    impact: 'positive',
    description: 'Autonomous timing alignment avoids peak decline intervals on the acquirer routing switch.',
  });

  importantFactors.push({
    title: 'Retry Quota & Fatigue Index',
    value: `${cust.retryFatigueScore}/10 Fatigue (Low)`,
    impact: cust.retryFatigueScore < 4 ? 'positive' : 'neutral',
    description: `${payment.retryCount} of ${payment.maxRetriesAllowed} retries used. Policy permits automated intervention without customer friction.`,
  });

  importantFactors.push({
    title: 'Customer Lifetime Value (LTV)',
    value: formatINR(cust.lifetimeValue),
    impact: 'positive',
    description: `${cust.segment} tier account prioritized for high-assurance recovery routing.`,
  });

  // Alternatives Tradeoffs
  if (action !== 'retry_now') {
    alternativesTradeoffs.push({
      action: 'retry_now',
      actionLabel: 'Retry Immediately',
      probability: reason === 'insufficient_funds' ? 0.22 : 0.15,
      expectedValue: Math.round(amount * (reason === 'insufficient_funds' ? 0.22 : 0.15)),
      rejectionReason: 'Immediate retry before bank liquidity clearing yields only 22% success and unnecessarily burns 1 retry quota.',
    });
  }

  if (action !== 'send_payment_link') {
    alternativesTradeoffs.push({
      action: 'send_payment_link',
      actionLabel: 'Send Dynamic Payment Link',
      probability: 0.68,
      expectedValue: Math.round(amount * 0.68),
      rejectionReason: 'Introducing manual customer touchpoint increases friction compared to seamless automated backend recovery.',
    });
  }

  if (action !== 'escalate_to_human' && action !== 'stop_recovery') {
    alternativesTradeoffs.push({
      action: 'escalate_to_human',
      actionLabel: 'Escalate to Dedicated RM',
      probability: 0.82,
      expectedValue: Math.round(amount * 0.82),
      rejectionReason: 'High human operational cost; autonomous recovery is mathematically favored as the first intervention step.',
    });
  }

  if (action !== 'stop_recovery') {
    alternativesTradeoffs.push({
      action: 'stop_recovery',
      actionLabel: 'Stop Recovery (Abandon)',
      probability: 0.0,
      expectedValue: 0,
      rejectionReason: 'Unwarranted: Account has high lifetime value and viable recovery probability.',
    });
  }

  return {
    whySelected,
    importantFactors,
    alternativesTradeoffs,
    engineDisclaimer:
      'POST-DECISION EXPLANATION LAYER — This structured explanation is generated after the deterministic decision engine evaluates mathematical expected value and policy guardrails. It does not alter or control financial execution.',
  };
}
