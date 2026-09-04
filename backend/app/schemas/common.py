from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CanonicalAction(str, Enum):
    RETRY_NOW = "retry_now"
    RETRY_LATER = "retry_later"
    SEND_PAYMENT_LINK = "send_payment_link"
    SEND_REMINDER = "send_reminder"
    REQUEST_PAYMENT_METHOD_UPDATE = "request_payment_method_update"
    ESCALATE_TO_HUMAN = "escalate_to_human"
    STOP_RECOVERY = "stop_recovery"

class PaymentMethod(str, Enum):
    CARD = "card"
    UPI = "upi"
    NETBANKING = "netbanking"
    MANDATE = "mandate"
    WALLET = "wallet"

class FailureReason(str, Enum):
    INSUFFICIENT_FUNDS = "insufficient_funds"
    TECHNICAL_GLITCH = "technical_glitch"
    CARD_EXPIRED = "card_expired"
    AUTH_TIMEOUT = "auth_timeout"
    CUSTOMER_DROPOFF = "customer_dropoff"
    MANDATE_INVALID = "mandate_invalid"
    LIMIT_EXCEEDED = "limit_exceeded"

class PaymentStatus(str, Enum):
    AT_RISK = "at_risk"
    RECOVERING = "recovering"
    RECOVERED = "recovered"
    FAILED = "failed"
    ABANDONED = "abandoned"

class PriorityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class PolicyStatus(str, Enum):
    SATISFIED = "satisfied"
    RESTRICTED = "restricted"
    BLOCKED = "blocked"

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SCHEDULED = "scheduled"
    SKIPPED = "skipped"
