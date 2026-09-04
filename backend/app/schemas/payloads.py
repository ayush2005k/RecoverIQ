from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from .common import (
    CanonicalAction,
    PaymentMethod,
    FailureReason,
    PaymentStatus,
    PriorityLevel,
    PolicyStatus,
    ExecutionStatus,
)

class CustomerContext(BaseModel):
    customerId: str
    customerName: str
    email: str
    segment: str  # Enterprise, Growth, SMB, Retail
    lifetimeValue: float
    totalSuccessfulPayments: int
    totalFailedPayments: int
    historicalRecoveryRate: float
    avgRecoveryLatencyHours: float
    retryFatigueScore: float

class CandidateAction(BaseModel):
    action: CanonicalAction
    label: str
    probability: float  # action-specific estimated success probability
    expectedRecovery: float  # amount * probability
    confidence: float
    isRecommended: bool
    policyStatus: PolicyStatus
    policyNotes: Optional[str] = None

class PolicyCheck(BaseModel):
    id: str
    ruleName: str
    description: str
    status: str  # passed, warning, failed
    detail: str

class PaymentRecord(BaseModel):
    id: str
    amount: float
    currency: str = "INR"
    customer: CustomerContext
    paymentMethod: PaymentMethod
    paymentMethodDetails: str
    failureReason: FailureReason
    failureCode: str
    failedAt: str
    recoveryProbability: float  # Base ML recovery probability
    expectedRecoveryValue: float  # Expected value for the recommended action
    recommendedAction: CanonicalAction
    priority: PriorityLevel
    status: PaymentStatus
    retryCount: int
    maxRetriesAllowed: int
    aiExplanation: Optional[str] = None
    candidateActions: Optional[List[CandidateAction]] = None
    guardrails: Optional[List[PolicyCheck]] = None
    executionStatus: Optional[ExecutionStatus] = None
    recoveredAmount: Optional[float] = None
    structuredExplanation: Optional[Dict[str, Any]] = None

class ExecuteRequest(BaseModel):
    action_type: Optional[CanonicalAction] = None

class DecisionRecord(BaseModel):
    id: str
    paymentId: str
    customerName: str
    customerSegment: Optional[str] = None
    amount: float
    recoveryProbability: float  # Base ML recovery probability
    recommendedAction: CanonicalAction
    actionLabel: str
    expectedRecovery: float
    policyStatus: PolicyStatus
    policyChecksCount: Optional[Dict[str, int]] = None
    executionStatus: ExecutionStatus
    recoveredAmount: float
    modelVersion: str
    aiExplanationSnippet: str
    timestamp: str
    failureReason: Optional[FailureReason] = None
    failureCode: Optional[str] = None
    paymentMethod: Optional[PaymentMethod] = None
    paymentMethodDetails: Optional[str] = None
    inputFeatures: Optional[Dict[str, Any]] = None
    candidateActions: Optional[List[CandidateAction]] = None
    guardrails: Optional[List[PolicyCheck]] = None
    structuredExplanation: Optional[Dict[str, Any]] = None

class TimeseriesDataPoint(BaseModel):
    date: str
    label: str
    aiRecovered: float
    baselineRecovered: float
    revenueAtRisk: float

class FailureReasonBreakdown(BaseModel):
    reason: FailureReason
    label: str
    revenueAtRisk: float
    recoveredRevenue: float
    recoveryRate: float
    caseCount: int

class PaymentMethodBreakdown(BaseModel):
    method: PaymentMethod
    label: str
    revenueAtRisk: float
    recoveredRevenue: float
    recoveryRate: float
    sharePercent: float

class DashboardSummary(BaseModel):
    revenueAtRisk: float
    predictedRecoverableRevenue: float
    revenueRecovered: float
    incrementalRevenue: float
    incrementalPercentage: float
    recoveryRate: float
    baselineRecoveryRate: float
    activeCasesCount: int
    totalCasesProcessed: int
    timeseries: List[TimeseriesDataPoint]
    failureBreakdown: List[FailureReasonBreakdown]
    methodBreakdown: List[PaymentMethodBreakdown]
    highPriorityCases: List[PaymentRecord]
    recentDecisions: List[DecisionRecord]
    datasetType: str = "synthetic_demo"
    lastUpdated: str

class ScoreResponse(BaseModel):
    paymentId: str
    modelVersion: str
    baseRecoveryProbability: float
    predictedAt: str
    features: Dict[str, Any]

class DecideResponse(BaseModel):
    decisionId: str
    paymentId: str
    modelVersion: str
    baseRecoveryProbability: float
    recommendedAction: CanonicalAction
    actionLabel: str
    expectedRecoveryValue: float
    policyStatus: PolicyStatus
    candidateActions: List[CandidateAction]
    guardrails: List[PolicyCheck]
    structuredExplanation: Dict[str, Any]
    aiExplanationSnippet: str
    timestamp: str

class ExecuteResponse(BaseModel):
    actionId: str
    decisionId: str
    paymentId: str
    actionType: CanonicalAction
    executionStatus: ExecutionStatus
    simulatedReference: str
    recovered: bool
    recoveredAmount: float
    executionLogs: List[str]
    executedAt: str

class SeedResponse(BaseModel):
    status: str
    totalCustomers: int
    totalPayments: int
    activeAtRisk: int
    recoveredCases: int
    seed: int
    message: str

class MetricsResponse(BaseModel):
    modelVersion: str
    evaluationSampleCount: int
    mlMetrics: Dict[str, Any]
    recoveryComparison: Dict[str, Any]
