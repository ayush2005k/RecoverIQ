import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TimeseriesDataPoint } from '../../types';
import { formatINR } from '../../utils/formatters';
import { Scale } from 'lucide-react';

interface RecoveryVsBaselineChartProps {
  data: TimeseriesDataPoint[];
  incrementalRevenue: number;
  incrementalPercentage: number;
}

export const RecoveryVsBaselineChart: React.FC<RecoveryVsBaselineChartProps> = ({
  data,
  incrementalRevenue,
  incrementalPercentage,
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const aiVal = payload.find((p: any) => p.dataKey === 'aiRecovered')?.value || 0;
      const baselineVal = payload.find((p: any) => p.dataKey === 'baselineRecovered')?.value || 0;
      const delta = aiVal - baselineVal;

      return (
        <div className="bg-[#FAF9F5] border border-stone-800 p-3 shadow-md text-xs space-y-1.5 font-mono">
          <p className="font-bold text-stone-900 border-b border-stone-300 pb-1">{label} Telemetry</p>
          <div className="flex items-center justify-between gap-4 text-emerald-900 font-semibold">
            <span>RecoverIQ (AI Strategy):</span>
            <span className="font-bold">{formatINR(aiVal, { compact: false })}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-stone-600">
            <span>Naive Fixed Retry (Baseline):</span>
            <span className="font-semibold">{formatINR(baselineVal, { compact: false })}</span>
          </div>
          <div className="pt-1.5 border-t border-stone-300 flex items-center justify-between gap-4 text-amber-950 font-bold">
            <span>Realized Alpha / Lift:</span>
            <span>+{formatINR(delta, { compact: true })}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE1]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-stone-100 border border-stone-300 text-stone-800">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-900">
              RecoverIQ AI Strategy vs. Naive Baseline
            </h3>
            <p className="text-xs text-stone-500">
              Cumulative recovered revenue comparison over current synthetic billing cycle
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1 bg-amber-50 border border-amber-300 text-amber-950 text-xs font-mono font-bold">
            +{formatINR(incrementalRevenue, { compact: true })} (+{incrementalPercentage}%) Alpha
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#047857" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#047857" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#78716c" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#78716c" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#E6E2D8" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#78716c"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E6E2D8' }}
              fontFamily="JetBrains Mono"
            />
            <YAxis
              stroke="#78716c"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E6E2D8' }}
              tickFormatter={(value) => formatINR(value, { compact: true })}
              fontFamily="JetBrains Mono"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: 'JetBrains Mono' }}
              formatter={(value) => (
                <span className="text-stone-800 font-medium">
                  {value === 'aiRecovered' ? 'RecoverIQ Autonomous Engine' : 'Naive Fixed 3-Day Retry Baseline'}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="aiRecovered"
              stroke="#047857"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#aiGradient)"
              name="aiRecovered"
            />
            <Area
              type="monotone"
              dataKey="baselineRecovered"
              stroke="#78716c"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#baselineGradient)"
              name="baselineRecovered"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
