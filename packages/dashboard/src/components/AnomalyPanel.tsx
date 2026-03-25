import { GridEvent, GridEventSeverity } from '../types';

interface Props {
  events: GridEvent[];
  onResolve: (eventId: string) => void;
}

const SEVERITY_CLASS: Record<GridEventSeverity, string> = {
  info: 'severity-info',
  warning: 'severity-warning',
  critical: 'severity-critical',
};

const EVENT_ICON: Record<string, string> = {
  OUTAGE: '⚡',
  SURGE: '⬆️',
  FREQUENCY_DEVIATION: '〰️',
  VOLTAGE_SAP: '⬇️',
  DEMAND_SPIKE: '📈',
  SUPPLY_SHORTFALL: '📉',
  RECONNECTION: '🔌',
  ANOMALY: '⚠️',
};

export function AnomalyPanel({ events, onResolve }: Props) {
  const active = events.filter((e) => !e.resolved);
  const recent = events.filter((e) => e.resolved).slice(0, 5);

  return (
    <section className="card anomaly-panel">
      <h2>Anomaly Detection</h2>

      {active.length === 0 ? (
        <p className="no-events">No active anomalies — grid nominal.</p>
      ) : (
        <ul className="event-list">
          {active.map((event) => (
            <li key={event.id} className={`event-item ${SEVERITY_CLASS[event.severity]}`}>
              <div className="event-header">
                <span className="event-icon">{EVENT_ICON[event.type] ?? '❓'}</span>
                <span className="event-type">{event.type.replace(/_/g, ' ')}</span>
                <span className={`badge ${SEVERITY_CLASS[event.severity]}`}>{event.severity.toUpperCase()}</span>
                <span className="event-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="event-desc">{event.description}</p>
              <p className="event-meta">
                Participant: <strong>{event.participantId}</strong> · Sensor: {event.sensorId}
              </p>
              <button className="resolve-btn" onClick={() => onResolve(event.id)}>
                Resolve
              </button>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <>
          <h3 className="chart-title" style={{ marginTop: '1rem' }}>Recently resolved</h3>
          <ul className="event-list resolved">
            {recent.map((event) => (
              <li key={event.id} className="event-item resolved">
                <span className="event-icon">{EVENT_ICON[event.type] ?? '❓'}</span>
                <span className="event-type">{event.type.replace(/_/g, ' ')}</span>
                <span className="event-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
