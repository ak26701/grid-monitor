export interface SubmitReadingBody {
  sensorId: string;
  participantId: string;
  role: 'utility' | 'solar_farm' | 'battery_operator' | 'sensor';
  supplyKW: number;
  demandKW: number;
  voltageV: number;
  frequencyHz: number;
}

export interface WsMessage {
  type: 'grid_state' | 'new_reading' | 'grid_event' | 'event_resolved' | 'error';
  payload: unknown;
}
