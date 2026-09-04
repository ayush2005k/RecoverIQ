import React from 'react';
import { PriorityLevel, PaymentStatus, PolicyStatus, ExecutionStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate' | 'gold';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  className = '',
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    amber: 'bg-amber-50 text-amber-900 border-amber-300',
    indigo: 'bg-indigo-50 text-indigo-900 border-indigo-300',
    rose: 'bg-rose-50 text-rose-800 border-rose-300',
    slate: 'bg-stone-100 text-stone-700 border-stone-300',
    gold: 'bg-amber-100 text-amber-950 border-amber-400 font-semibold',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  switch (priority) {
    case 'critical':
      return <Badge variant="rose">CRITICAL</Badge>;
    case 'high':
      return <Badge variant="amber">HIGH</Badge>;
    case 'medium':
      return <Badge variant="indigo">MEDIUM</Badge>;
    case 'low':
      return <Badge variant="slate">LOW</Badge>;
    default:
      return <Badge variant="slate">{priority}</Badge>;
  }
};

export const StatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  switch (status) {
    case 'at_risk':
      return <Badge variant="amber">AT RISK</Badge>;
    case 'recovering':
      return <Badge variant="indigo">RECOVERING</Badge>;
    case 'recovered':
      return <Badge variant="emerald">RECOVERED</Badge>;
    case 'failed':
      return <Badge variant="rose">FAILED</Badge>;
    case 'abandoned':
      return <Badge variant="slate">ABANDONED</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
};

export const PolicyBadge: React.FC<{ status: PolicyStatus }> = ({ status }) => {
  switch (status) {
    case 'satisfied':
      return <Badge variant="emerald">SATISFIED</Badge>;
    case 'restricted':
      return <Badge variant="amber">RESTRICTED</Badge>;
    case 'blocked':
      return <Badge variant="rose">BLOCKED</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
};

export const ExecutionBadge: React.FC<{ status: ExecutionStatus }> = ({ status }) => {
  switch (status) {
    case 'succeeded':
      return <Badge variant="emerald">SUCCEEDED</Badge>;
    case 'scheduled':
      return <Badge variant="indigo">SCHEDULED</Badge>;
    case 'pending':
      return <Badge variant="amber">PENDING</Badge>;
    case 'skipped':
      return <Badge variant="slate">SKIPPED</Badge>;
    case 'failed':
      return <Badge variant="rose">FAILED</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
};
