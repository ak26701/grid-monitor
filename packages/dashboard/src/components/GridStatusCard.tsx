import { GridState } from '../types';

interface Props {
  state: GridState | null;
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent ?? ''}`}>
        {value}
        {unit && <span className="stat-unit"> {unit}</span>}
      </div>
    </div>
  );
}

export function GridStatusCard({ state }: Props) {
  if (!state) {
    return <div className="card placeholder">Connecting to ledger...</div>;
  }

  const balance = state.netBalanceKW;
  const balanceAccent = balance >= 0 ? 'positive' : 'negative';
  const freqOk = Math.abs(state.avgFrequencyHz - 50) < 0.5;

  return (
    <section className="card grid-status">
      <h2>Live Grid State</h2>
      <p className="last-updated">Last updated: {new Date(state.lastUpdated).toLocaleTimeString()}</p>
      <div className="stats-grid">
        <Stat label="Total Supply" value={state.totalSupplyKW.toFixed(1)} unit="kW" accent="positive" />
        <Stat label="Total Demand" value={state.totalDemandKW.toFixed(1)} unit="kW" />
        <Stat label="Net Balance" value={(balance >= 0 ? '+' : '') + balance.toFixed(1)} unit="kW" accent={balanceAccent} />
        <Stat label="Avg Frequency" value={state.avgFrequencyHz.toFixed(2)} unit="Hz" accent={freqOk ? 'positive' : 'negative'} />
        <Stat label="Avg Voltage" value={state.avgVoltageV.toFixed(1)} unit="V" />
        <Stat label="Active Nodes" value={String(state.activeParticipants.length)} />
      </div>
      {state.unresolvedEventCount > 0 && (
        <div className="alert-badge">
          {state.unresolvedEventCount} unresolved event{state.unresolvedEventCount > 1 ? 's' : ''}
        </div>
      )}
    </section>
  );
}
