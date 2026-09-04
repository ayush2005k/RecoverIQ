import React from 'react';
import { formatINR } from '../../utils/formatters';

interface MetricCardProps {
  title: string;
  amount?: number;
  formattedValue?: string;
  subValue?: string;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'indigo' | 'neutral' | 'gold' | 'danger';
  icon?: React.ReactNode;
  secondaryNote?: string;
  highlightVariant?: 'emerald' | 'amber' | 'indigo' | 'slate' | 'gold';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  amount,
  formattedValue,
  subValue,
  badgeText,
  badgeVariant = 'neutral',
  icon,
  secondaryNote,
  highlightVariant = 'slate',
  tooltip,
}) => {
  const displayValue = formattedValue ?? (amount !== undefined ? formatINR(amount, { compact: true }) : '—');
  const rawValue = amount !== undefined ? formatINR(amount, { compact: false }) : undefined;

  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    warning: 'bg-amber-50 text-amber-900 border-amber-300',
    indigo: 'bg-indigo-50 text-indigo-900 border-indigo-300',
    gold: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
    danger: 'bg-rose-50 text-rose-800 border-rose-300',
    neutral: 'bg-stone-100 text-stone-700 border-stone-300',
  }[badgeVariant];

  const topAccents = {
    emerald: 'border-t-2 border-t-emerald-700',
    amber: 'border-t-2 border-t-amber-600',
    indigo: 'border-t-2 border-t-indigo-700',
    gold: 'border-t-2 border-t-amber-500',
    slate: 'border-t-2 border-t-stone-800',
  }[highlightVariant];

  return (
    <div
      title={tooltip || rawValue}
      className={`relative p-5 bg-white border border-[#E6E2D8] ${topAccents} flex flex-col justify-between shadow-sm transition-all hover:border-stone-400`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-500">
            {title}
          </span>
          {icon && <div className="text-stone-400">{icon}</div>}
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 tracking-tight">
            {displayValue}
          </span>
          {rawValue && rawValue !== displayValue && (
            <span className="text-[11px] font-mono text-stone-500 hidden sm:inline" title="Full Amount">
              ({rawValue})
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F0ECE1] flex items-center justify-between gap-2 text-xs">
        {subValue ? (
          <span className="text-stone-600 font-medium truncate text-[11px]">{subValue}</span>
        ) : (
          <span className="text-stone-400 text-[11px]">{secondaryNote || 'Current billing cycle'}</span>
        )}

        {badgeText && (
          <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold border ${badgeStyles}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
