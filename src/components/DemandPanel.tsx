import { AICompany, PipelineStage, CompanyStage } from '../types';

interface Props {
  companies: AICompany[];
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

const STAGE_LABELS: Record<CompanyStage, string> = {
  seed: 'Seed', series_a: 'Series A', series_b: 'Series B', series_c: 'Series C', growth: 'Growth',
};

const USE_CASE_COLORS: Record<string, string> = {
  training: '#8b5cf6', inference: '#3b82f6', both: '#06b6d4',
};

export function DemandPanel({ companies }: Props) {
  const sorted = [...companies].sort((a, b) => b.computeUrgencyScore - a.computeUrgencyScore);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Demand Side — AI Companies & Labs</h2>
        <span className="panel-count">{companies.length} companies tracked</span>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Stage</th>
              <th>Total Raised</th>
              <th>Last Round</th>
              <th>Use Case</th>
              <th>H100-hrs/mo</th>
              <th>Regions</th>
              <th>Urgency Score</th>
              <th>Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.id} className="table-row">
                <td>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {c.headcount} headcount · {c.keyContact}
                  </div>
                </td>
                <td>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>{STAGE_LABELS[c.stage]}</span>
                </td>
                <td style={{ fontWeight: 500, color: '#e2e8f0' }}>
                  ${c.totalRaisedM >= 1000
                    ? `${(c.totalRaisedM / 1000).toFixed(1)}B`
                    : `${c.totalRaisedM}M`}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>
                    ${c.lastFunding.amountM}M
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {c.lastFunding.round} · {c.lastFunding.date}
                  </div>
                </td>
                <td>
                  <span style={{
                    background: `${USE_CASE_COLORS[c.computeUseCase]}20`,
                    color: USE_CASE_COLORS[c.computeUseCase],
                    border: `1px solid ${USE_CASE_COLORS[c.computeUseCase]}40`,
                    borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  }}>
                    {c.computeUseCase}
                  </span>
                </td>
                <td style={{ fontWeight: 500, color: '#e2e8f0' }}>
                  {c.monthlyH100Hours.toLocaleString()}
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    ${Math.round(c.monthlyH100Hours * 2.64 / 1000)}K/mo est.
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.preferredRegions.map(r => (
                      <span key={r} className="region-tag">{r}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 16, fontWeight: 700, color: scoreColor(c.computeUrgencyScore),
                      minWidth: 30,
                    }}>
                      {c.computeUrgencyScore}
                    </span>
                    <div title={c.computeUrgencyReason} style={{ cursor: 'help', color: '#475569', fontSize: 12 }}>ⓘ</div>
                  </div>
                </td>
                <td><PipelineBadge stage={c.pipelineStage} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel-footnote">
        Compute Urgency Score: likelihood company needs GPU capacity access in the next 90 days. Hover ⓘ for reasoning.
        Monthly cost estimated at $2.64/H100-hr (OCPI on-demand index).
      </div>
    </div>
  );
}
