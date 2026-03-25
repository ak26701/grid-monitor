import { GridState, ParticipantSnapshot } from '../types';
import { StatCard } from './ui/StatCard';
import { Gauge } from './ui/Gauge';
import { getParticipantConfig } from '../lib/participantConfig';

interface Props {
  state: GridState | null;
  participants: ParticipantSnapshot[];
}

export function GridStatusCard({ state, participants }: Props) {
  if (!state) {
    return (
      <div className="card placeholder-card">
        <div className="placeholder-spinner" />
        <p>Connecting to ledger...</p>
      </div>
    );
  }

  const balance = state.netBalanceKW;
  const balanceAccent = balance >= 0 ? 'positive' : 'negative';
  const freqOk = Math.abs(state.avgFrequencyHz - 50) < 0.5;
  const voltOk = Math.abs(state.avgVoltageV - 230) / 230 < 0.10;

  return (
    <section className="card overview-card">
      <div className="card-header">
        <h2>Live Grid State</h2>
        <span className="last-updated">
          Updated {new Date(state.lastUpdated).toLocaleTimeString()}
          {state.blockHeight !== undefined && (
            <span className="block-height"> · Block #{state.blockHeight}</span>
          )}
        </span>
      </div>

      {/* Gauges row */}
      <div className="gauges-row">
        <div className="gauge-wrap">
          <Gauge
            value={state.avgFrequencyHz}
            min={49}
            max={51}
            label="Frequency"
            unit="Hz"
            normalZone={[0.3, 0.7]}
            normalColor={freqOk ? '#22d3ee' : '#ef4444'}
            alertColor="#ef4444"
          />
        </div>
        <div className="gauge-wrap">
          <Gauge
            value={state.avgVoltageV}
            min={200}
            max={260}
            label="Voltage"
            unit="V"
            normalZone={[0.25, 0.75]}
            normalColor={voltOk ? '#a78bfa' : '#f97316'}
            alertColor="#f97316"
          />
        </div>
        <div className="gauge-wrap balance-gauge">
          <Gauge
            value={Math.abs(balance)}
            min={0}
            max={Math.max(state.totalSupplyKW, state.totalDemandKW, 100)}
            label="Net Balance"
            unit="kW"
            normalZone={[0, 0.2]}
            normalColor={balance >= 0 ? '#10b981' : '#ef4444'}
            alertColor="#ef4444"
          />
          <span className={`balance-sign ${balance >= 0 ? 'positive' : 'negative'}`}>
            {balance >= 0 ? 'SURPLUS' : 'DEFICIT'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <StatCard
          label="Total Supply"
          value={state.totalSupplyKW.toFixed(1)}
          unit="kW"
          accent="positive"
          live
        />
        <StatCard
          label="Total Demand"
          value={state.totalDemandKW.toFixed(1)}
          unit="kW"
          accent="neutral"
          live
        />
        <StatCard
          label="Net Balance"
          value={(balance >= 0 ? '+' : '') + balance.toFixed(1)}
          unit="kW"
          accent={balanceAccent}
        />
        <StatCard
          label="Active Nodes"
          value={state.activeParticipants.length}
          subtext="organizations"
          accent="neutral"
        />
        <StatCard
          label="Open Anomalies"
          value={state.unresolvedEventCount}
          accent={state.unresolvedEventCount > 0 ? 'warning' : 'neutral'}
          subtext={state.unresolvedEventCount === 0 ? 'grid nominal' : 'needs attention'}
        />
      </div>

      {/* Per-participant strip */}
      {participants.length > 0 && (
        <div className="participant-strip">
          {participants.map((p) => {
            const cfg = getParticipantConfig(p.participantId);
            const net = p.supplyKW - p.demandKW;
            return (
              <div key={p.participantId} className="participant-chip" style={{ borderColor: cfg.color }}>
                <div className="participant-chip-header" style={{ color: cfg.color }}>
                  <span className="participant-icon">{cfg.icon}</span>
                  {cfg.label}
                </div>
                <div className="participant-chip-row">
                  <span className="chip-label">Supply</span>
                  <span className="chip-value" style={{ color: cfg.color }}>{p.supplyKW.toFixed(1)} kW</span>
                </div>
                <div className="participant-chip-row">
                  <span className="chip-label">Demand</span>
                  <span className="chip-value">{p.demandKW.toFixed(1)} kW</span>
                </div>
                <div className="participant-chip-row">
                  <span className="chip-label">Net</span>
                  <span className={`chip-value ${net >= 0 ? 'positive' : 'negative'}`}>
                    {net >= 0 ? '+' : ''}{net.toFixed(1)} kW
                  </span>
                </div>
                <div className="participant-chip-row">
                  <span className="chip-label">Freq</span>
                  <span className="chip-value mono">{p.frequencyHz.toFixed(2)} Hz</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
