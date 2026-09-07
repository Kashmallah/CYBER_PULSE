import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { ShapFeature } from '../types';
import { Cpu, Activity } from 'lucide-react';

interface ShapAttributionProps {
  features: ShapFeature[];
  title?: string;
  isSimulating?: boolean;
}

export const ShapAttribution: React.FC<ShapAttributionProps> = ({
  features,
  title = "Real-Time PyTorch SHAP Gradient Feature Attribution",
  isSimulating = false
}) => {
  const chartData = features.map(f => ({
    name: f.name,
    value: f.value,
    absVal: Math.abs(f.value),
    impact: f.value >= 0 ? 'Malicious Indication' : 'Benign Regularizer'
  }));

  return (
    <div className="w-full h-full glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold font-mono tracking-wide text-slate-200 uppercase">{title}</h3>
        </div>
        {isSimulating && (
          <span className="flex items-center space-x-1.5 text-[11px] font-mono text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded">
            <Activity className="w-3 h-3 animate-spin" />
            <span>ATTACK SIGNATURE ACTIVE</span>
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Quantifying exact mathematical feature contributions toward neural decision boundary ($f(x)$ logits).
      </p>

      {/* Chart */}
      <div className="w-full h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
          >
            <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#cbd5e1', width: 90 }}
              width={95}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-lg text-xs font-mono">
                      <div className="font-bold text-white mb-1">{data.name}</div>
                      <div className={data.value >= 0 ? "text-rose-400" : "text-emerald-400"}>
                        SHAP Value: {data.value > 0 ? `+${data.value}` : data.value}
                      </div>
                      <div className="text-slate-400 text-[10px] mt-0.5">{data.impact}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value >= 0 ? '#ff0055' : '#00ff88'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Indicators */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 mt-1">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
          <span>+ Attack Weight</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded bg-emerald-400"></span>
          <span>- Benign Baseline</span>
        </div>
      </div>
    </div>
  );
};
