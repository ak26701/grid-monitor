import { MarketMatch } from '../types';

interface Props {
  matches: MarketMatch[];
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const config = {
    high:   { label: 'HIGH PRIORITY', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    medium: { label: 'MEDIUM',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    low:    { label: 'LOW',           color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  };
  const c = config[priority];
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.color}40`,
      borderRadius: 3, padding: '2px 7px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {c.label}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? '#10b981' : score >= 75 ? '#f59e0b' : '#6b7280';
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
      background: `conic-gradient(${color} ${score * 3.6}deg, #1e2235 0deg)`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: '#0f1117',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color,
      }}>
        {score}
      </div>
    </div>
  );
}

export function MatchPanel({ matches }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Supply–Demand Match Engine</h2>
        <span className="panel-count">{matches.length} matches identified</span>
      </div>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
        Matches are scored on provider availability, utilization pressure, regional alignment, contract preference overlap,
        and deal urgency. Each match represents a potential structured compute contract or marketplace onboarding.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {matches.map(m => (
          <div key={m.id} className="match-card">
            <ScoreRing score={m.matchScore} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>
                  {m.providerName}
                </span>
                <span style={{ color: '#475569' }}>↔</span>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>
                  {m.companyName}
                </span>
                <PriorityBadge priority={m.priority} />
              </div>

              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10 }}>
                {m.reasoning}
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="match-meta">
                  <span className="match-meta-label">Est. Annual Value</span>
                  <span className="match-meta-value green">{m.estimatedAnnualValue}</span>
                </div>
                <div className="match-meta">
                  <span className="match-meta-label">GPU Count</span>
                  <span className="match-meta-value">{m.estimatedGPUs.toLocaleString()} × {m.gpuModel.replace('_', ' ')}</span>
                </div>
                <div className="match-meta">
                  <span className="match-meta-label">Contract Type</span>
                  <span className="match-meta-value">{m.suggestedContract}</span>
                </div>
                <div className="match-meta">
                  <span className="match-meta-label">Time to Close</span>
                  <span className="match-meta-value">{m.timeToClose}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-footnote">
        Match Score reflects combined hedge readiness + compute urgency + alignment multipliers. All deal sizes are estimates based on GPU count × OCPI reserved rate × 8,760 hrs/yr.
      </div>
    </div>
  );
}
