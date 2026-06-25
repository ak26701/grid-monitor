import { ComputeProvider, PipelineStage } from '../types';

interface Props {
  providers: ComputeProvider[];
}

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 65) return '#f59e0b';
  return '#6b7280';
}

function PipelineBadge({ stage }: { stage: PipelineStage }) {
  const config: Record<PipelineStage, { label: string; color: string; bg: string }> = {
    prospect:       { label: 'Prospect',       color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    contacted:      { label: 'Contacted',       color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    in_negotiation: { label: 'In Negotiation',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    onboarded:      { label: 'Onboarded',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  };
  const c = config[stage];
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.color}40`,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const color = pct < 65 ? '#f59e0b' : pct < 85 ? '#10b981' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 64, height: 6, background: '#1e2235', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

export function SupplyPanel({ providers }: Props) {
  const sorted = [...providers].sort((a, b) => b.hedgeReadinessScore - a.hedgeReadinessScore);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Supply Side — Compute Providers</h2>
        <span className="panel-count">{providers.length} providers tracked</span>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>H100 Fleet</th>
              <th>On-Demand</th>
              <th>Reserved (1yr)</th>
              <th>Spot</th>
              <th>Utilization</th>
              <th>Regions</th>
              <th>Hedge Score</th>
              <th>Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => {
              const h100 = p.inventory.find(i => i.model === 'H100_SXM5' || i.model === 'H100_PCIe');
              const od = h100 ? (p.livePrices?.[`${h100.model}_onDemand`] ?? h100.priceOnDemand) : null;
              const rs = h100 ? (p.livePrices?.[`${h100.model}_reserved`] ?? h100.priceReserved) : null;
              const sp = h100 ? (p.livePrices?.[`${h100.model}_spot`] ?? h100.priceSpot) : null;

              return (
                <tr key={p.id} className="table-row">
                  <td>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {p.type} · {p.totalH100Equiv.toLocaleString()} H100-equiv
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {h100 ? `${h100.totalUnits.toLocaleString()} H100s` : '—'}
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {h100?.availableUnits.toLocaleString()} avail
                    </div>
                  </td>
                  <td className="price-cell">{od != null ? `$${od.toFixed(3)}` : '—'}</td>
                  <td className="price-cell dim">{rs != null ? `$${rs.toFixed(3)}` : '—'}</td>
                  <td className="price-cell muted">{sp != null ? `$${sp.toFixed(3)}` : '—'}</td>
                  <td><UtilBar pct={p.utilizationPct} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.regions.map(r => (
                        <span key={r} className="region-tag">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 16, fontWeight: 700, color: scoreColor(p.hedgeReadinessScore),
                        minWidth: 30,
                      }}>
                        {p.hedgeReadinessScore}
                      </span>
                      <div title={p.hedgeReadinessReason} style={{ cursor: 'help', color: '#475569', fontSize: 12 }}>ⓘ</div>
                    </div>
                  </td>
                  <td><PipelineBadge stage={p.pipelineStage} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel-footnote">
        Hedge Readiness Score: likelihood provider wants Ornn financial products (compute swaps, futures, offtake contracts). Hover ⓘ for reasoning.
      </div>
    </div>
  );
}
