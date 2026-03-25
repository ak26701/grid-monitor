/** Participant identity on the Fabric network */
export type ParticipantRole = 'utility' | 'solar_farm' | 'battery_operator' | 'sensor';

export interface EnergyReading {
  /** Composite key: "READING~{sensorId}~{timestamp}" */
  docType: 'energy_reading';
  id: string;
  sensorId: string;
  participantId: string;
  role: ParticipantRole;
  /** Kilowatts */
  supplyKW: number;
  /** Kilowatts */
  demandKW: number;
  /** Voltage in volts */
  voltageV: number;
  /** Frequency in Hz */
  frequencyHz: number;
  /** ISO-8601 */
  timestamp: string;
  blockHeight?: number;
}

export type GridEventSeverity = 'info' | 'warning' | 'critical';
export type GridEventType =
  | 'OUTAGE'
  | 'SURGE'
  | 'FREQUENCY_DEVIATION'
  | 'VOLTAGE_SAP'
  | 'DEMAND_SPIKE'
  | 'SUPPLY_SHORTFALL'
  | 'RECONNECTION'
  | 'ANOMALY';

export interface GridEvent {
  /** Composite key: "EVENT~{timestamp}~{id}" */
  docType: 'grid_event';
  id: string;
  type: GridEventType;
  severity: GridEventSeverity;
  participantId: string;
  sensorId: string;
  description: string;
  /** Snapshot of the reading that triggered this event */
  triggeringReadingId: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface GridState {
  docType: 'grid_state';
  id: 'CURRENT_STATE';
  totalSupplyKW: number;
  totalDemandKW: number;
  /** Supply - Demand */
  netBalanceKW: number;
  avgFrequencyHz: number;
  avgVoltageV: number;
  activeParticipants: string[];
  unresolvedEventCount: number;
  lastUpdated: string;
}

/** Thresholds used for on-chain anomaly detection */
export const ANOMALY_THRESHOLDS = {
  frequencyDeviationHz: 0.5,   // nominal 50 Hz ± 0.5
  voltageDeviationPct: 0.10,   // ± 10% of 230 V nominal
  nominalFrequencyHz: 50,
  nominalVoltageV: 230,
  maxImbalancePct: 0.20,       // demand/supply imbalance > 20% triggers warning
} as const;
