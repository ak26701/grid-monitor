import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MarketIndex } from '../types';

interface Props {
  marketData: MarketIndex | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:00`;
}

function formatPrice(v: number): string {
  return `$${v.toFixed(2)}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f1117', border: '1px solid #1e2235', borderRadius: 8,
      padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: '#64748b', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 3, fontWeight: 600 }}>
          {p.name}: ${p.value.toFixed(3)}/hr
        </div>
      ))}
    </div>
  );
};

export function PriceIndexChart({ marketData }: Props) {
  if (!marketData) {
    return (
      <div className="panel">
        <div className="panel-header"><h2>Compute Price Index (OCPI)</h2></div>
        <div className="loading-state">Loading index data...</div>
      </div>
    );
  }

  const data = marketData.history.filter((_, i) => i % 2 === 0).map(p => ({
    time: formatTime(p.timestamp),
    'On-Demand': p.h100OnDemand,
    'Reserved (1yr)': p.h100Reserved,
    'Spot': p.h100Spot,
    'H200 On-Demand': p.h200OnDemand,
  }));

  const curr = marketData.current;
  const up = marketData.change24hPct >= 0;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Compute Price Index (OCPI) — H100 Weighted Average</h2>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>
              ${curr.h100OnDemand.toFixed(3)}/hr
            </div>
            <div style={{ fontSize: 12, color: up ? '#ef4444' : '#10b981', fontWeight: 600 }}>
              {up ? '▲' : '▼'} {Math.abs(marketData.change24hPct).toFixed(2)}% (24h)
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'On-Demand', value: curr.h100OnDemand, color: '#3b82f6' },
          { label: 'Reserved (1yr)', value: curr.h100Reserved, color: '#10b981' },
          { label: 'Spot', value: curr.h100Spot, color: '#f59e0b' },
          { label: 'H200 On-Demand', value: curr.h200OnDemand, color: '#8b5cf6' },
        ].map(item => (
          <div key={item.label} style={{
            background: '#0f1117', border: '1px solid #1e2235', borderRadius: 8, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{formatPrice(item.value)}/hr</div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
          <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} interval={5} />
          <YAxis
            tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={v => `$${v.toFixed(2)}`} domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }} />
          <Line type="monotone" dataKey="On-Demand" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Reserved (1yr)" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Spot" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="H200 On-Demand" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
        <div className="index-stat">
          <div className="index-stat-label">Providers in Index</div>
          <div className="index-stat-value">{marketData.providerCount}</div>
        </div>
        <div className="index-stat">
          <div className="index-stat-label">Total H100 Supply Tracked</div>
          <div className="index-stat-value">{(marketData.totalH100Supply / 1000).toFixed(0)}K GPUs</div>
        </div>
        <div className="index-stat">
          <div className="index-stat-label">Avg Market Utilization</div>
          <div className="index-stat-value">{marketData.avgUtilization}%</div>
        </div>
      </div>
    </div>
  );
}
