export type ParticipantRole = 'utility' | 'solar_farm' | 'battery_operator' | 'sensor';

export interface EnergyReading {
  id: string;
  sensorId: string;
  participantId: string;
  role: ParticipantRole;
  supplyKW: number;
  demandKW: number;
  voltageV: number;
  frequencyHz: number;
  timestamp: string;
}

export type GridEventSeverity = 'info' | 'warning' | 'critical';
export type GridEventType =
  | 'OUTAGE' | 'SURGE' | 'FREQUENCY_DEVIATION' | 'VOLTAGE_SAP'
  | 'DEMAND_SPIKE' | 'SUPPLY_SHORTFALL' | 'RECONNECTION' | 'ANOMALY';

export interface GridEvent {
  id: string;
  type: GridEventType;
  severity: GridEventSeverity;
  participantId: string;
  sensorId: string;
  description: string;
  triggeringReadingId: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface GridState {
  totalSupplyKW: number;
  totalDemandKW: number;
  netBalanceKW: number;
  avgFrequencyHz: number;
  avgVoltageV: number;
  activeParticipants: string[];
  unresolvedEventCount: number;
  lastUpdated: string;
}

export interface WsMessage {
  type: 'grid_state' | 'new_reading' | 'grid_event' | 'event_resolved' | 'error';
  payload: unknown;
}
