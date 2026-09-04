import React from 'react';
import { formatPercent } from '../../utils/formatters';

interface ProbabilityBadgeProps {
  probability: number; // 0 to 1
  showBar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const ProbabilityBadge: React.FC<ProbabilityBadgeProps> = ({
  probability,
  showBar = false,
  size = 'md',
  label,
}) => {
  const probNum = probability > 1 ? probability / 100 : probability;
  const percentFormatted = formatPercent(probNum);

  let textColor = 'text-emerald-800';
  let bgColor = 'bg-emerald-50 border-emerald-300';
  let barFill = 'bg-emerald-600';

  if (probNum < 0.35) {
    textColor = 'text-rose-800';
    bgColor = 'bg-rose-50 border-rose-300';
    barFill = 'bg-rose-600';
  } else if (probNum < 0.7) {
    textColor = 'text-amber-800';
    bgColor = 'bg-amber-50 border-amber-300';
    barFill = 'bg-amber-600';
  }

  const textSizes = {
    sm: 'text-[11px] font-mono font-medium',
    md: 'text-xs font-mono font-semibold',
    lg: 'text-sm font-mono font-bold',
  }[size];

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${bgColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${barFill}`} />
        <span className={`${textSizes} ${textColor}`}>
          {percentFormatted}
        </span>
        {label && <span className="text-stone-500 text-[10px] font-normal">({label})</span>}
      </div>

      {showBar && (
        <div className="w-full bg-stone-200 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barFill}`}
            style={{ width: `${Math.min(100, Math.max(0, probNum * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
};
