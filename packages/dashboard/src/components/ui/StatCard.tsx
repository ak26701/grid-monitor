interface Props {
  label: string;
  value: string | number;
  unit?: string;
  accent?: 'positive' | 'negative' | 'warning' | 'muted' | 'neutral';
  subtext?: string;
  /** Show a small animated pulse to indicate live data */
  live?: boolean;
}

export function StatCard({ label, value, unit, accent = 'neutral', subtext, live }: Props) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-label">
        {live && <span className="stat-live-dot" aria-hidden />}
        {label}
      </div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit"> {unit}</span>}
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
