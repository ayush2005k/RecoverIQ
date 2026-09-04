import { CanonicalAction, FailureReason, PaymentMethod, PriorityLevel, PaymentStatus, PolicyStatus, ExecutionStatus } from '../types';

/**
 * Formats a number into Indian Rupee representation.
 * Supports compact mode (₹8.42L, ₹1.32Cr) and standard currency format (₹8,42,000).
 */
export function formatINR(
  amount: number,
  options?: { compact?: boolean; precision?: number }
): string {
  if (isNaN(amount)) return '₹0';

  const isCompact = options?.compact ?? false;
  const precision = options?.precision ?? 2;

  if (isCompact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (abs >= 10000000) {
      // 1 Crore = 10,000,000
      const cr = abs / 10000000;
      return `${sign}₹${cr.toFixed(precision).replace(/\.00$/, '')}Cr`;
    } else if (abs >= 100000) {
      // 1 Lakh = 100,000
      const l = abs / 100000;
      return `${sign}₹${l.toFixed(precision).replace(/\.00$/, '')}L`;
    } else if (abs >= 1000) {
      // 1 Thousand = 1,000
      const k = abs / 1000;
      return `${sign}₹${k.toFixed(1).replace(/\.0$/, '')}k`;
    } else {
      return `${sign}₹${abs.toLocaleString('en-IN')}`;
    }
  }

  // Full Indian Rupee format
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Formats standard decimal (0.785) into percentage string (78.5%)
 */
export function formatPercent(value: number, precision: number = 1): string {
  if (isNaN(value)) return '0%';
  const num = value > 1 ? value : value * 100;
  return `${num.toFixed(precision)}%`;
}

/**
 * Human-readable action labels separate from canonical action enums
 */
export function formatActionLabel(action: CanonicalAction): string {
  switch (action) {
    case 'retry_now':
      return 'Retry Now (Immediate)';
    case 'retry_later':
      return 'Retry Later (Smart Delay)';
    case 'send_payment_link':
      return 'Send Instant Payment Link';
    case 'send_reminder':
      return 'Send Customer Reminder';
    case 'request_payment_method_update':
      return 'Request Method Update';
    case 'escalate_to_human':
      return 'Escalate to Support Ops';
    case 'stop_recovery':
      return 'Stop Recovery (Abandon)';
    default:
      return String(action).replace(/_/g, ' ');
  }
}

/**
 * Human-readable short action badge
 */
export function formatActionShortLabel(action: CanonicalAction): string {
  switch (action) {
    case 'retry_now':
      return 'Retry Now';
    case 'retry_later':
      return 'Retry Later';
    case 'send_payment_link':
      return 'Payment Link';
    case 'send_reminder':
      return 'Reminder';
    case 'request_payment_method_update':
      return 'Update Method';
    case 'escalate_to_human':
      return 'Escalate';
    case 'stop_recovery':
      return 'Stop Recovery';
    default:
      return String(action).replace(/_/g, ' ');
  }
}

/**
 * Human-readable failure reason label
 */
export function formatFailureReason(reason: FailureReason): string {
  switch (reason) {
    case 'insufficient_funds':
      return 'Insufficient Funds';
    case 'technical_glitch':
      return 'Issuer / Gateway Timeout';
    case 'card_expired':
      return 'Expired Card';
    case 'auth_timeout':
      return 'OTP / 3DS Timeout';
    case 'customer_dropoff':
      return 'Customer Abandoned Auth';
    case 'mandate_invalid':
      return 'Invalid / Paused Mandate';
    case 'limit_exceeded':
      return 'Transaction Limit Exceeded';
    default:
      return String(reason).replace(/_/g, ' ');
  }
}

/**
 * Human-readable payment method label
 */
export function formatPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case 'card':
      return 'Credit / Debit Card';
    case 'upi':
      return 'UPI (Auto / Intent)';
    case 'netbanking':
      return 'NetBanking';
    case 'mandate':
      return 'E-Mandate / SI';
    case 'wallet':
      return 'Prepaid Wallet';
    default:
      return String(method).toUpperCase();
  }
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateString;
  }
}
