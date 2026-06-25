import { MarketAlert } from '../types';

interface Props {
  alerts: MarketAlert[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_ICONS: Record<MarketAlert['type'], string> = {
  price_drop: '▼',
  price_spike: '▲',
  new_funding: '💰',
  capacity_expansion: '📈',
  arbitrage: '⇄',
  low_utilization: '◎',
  capacity_drought: '⚠',
};

const TYPE_LABELS: Record<MarketAlert['type'], string> = {
  price_drop: 'Price Drop',
  price_spike: 'Price Spike',
  new_funding: 'New Funding',
  capacity_expansion: 'Capacity Expansion',
  arbitrage: 'Arbitrage',
  low_utilization: 'Low Utilization',
  capacity_drought: 'Capacity Drought',
};

function AlertCard({ alert }: { alert: MarketAlert }) {
  const severityColors = {
    opportunity: { border: '#10b981', bg: 'rgba(16,185,129,0.06)', label: '#10b981', labelBg: 'rgba(16,185,129,0.12)' },
    warning:     { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)', label: '#f59e0b', labelBg: 'rgba(245,158,11,0.12)' },
    info:        { border: '#3b82f6', bg: 'rgba(59,130,246,0.06)', label: '#3b82f6', labelBg: 'rgba(59,130,246,0.12)' },
  };
  const c = severityColors[alert.severity];

  return (
    <div style={{
      border: `1px solid ${c.border}50`, background: c.bg, borderRadius: 8,
      padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: c.labelBg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, color: c.label,
      }}>
        {TYPE_ICONS[alert.type]}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
          <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{alert.title}</span>
          <span style={{
            background: c.labelBg, color: c.label, border: `1px solid ${c.label}30`,
            borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            {alert.severity}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
            borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 600,
          }}>
            {TYPE_LABELS[alert.type]}
          </span>
          {alert.actionable && (
            <span style={{
              background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 600,
            }}>
              ACTIONABLE
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 6 }}>
          {alert.description}
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569' }}>
          {alert.affectedParty && <span>Entity: <span style={{ color: '#64748b' }}>{alert.affectedParty}</span></span>}
          <span>{timeAgo(alert.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

export function AlertPanel({ alerts }: Props) {
  const opportunities = alerts.filter(a => a.severity === 'opportunity');
  const warnings = alerts.filter(a => a.severity === 'warning');
  const info = alerts.filter(a => a.severity === 'info');

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Market Intelligence Feed</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>
            {opportunities.length} opportunities
          </span>
          <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
            {warnings.length} warnings
          </span>
          <span className="panel-count">{alerts.length} total</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.length === 0 ? (
          <div className="loading-state">No alerts yet. Live alerts will appear here.</div>
        ) : (
          [...opportunities, ...warnings, ...info].map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </div>
  );
}
