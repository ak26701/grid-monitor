/**
 * In-memory mock store that mirrors the GridMonitorContract chaincode behavior.
 *
 * Activated when USE_MOCK=true (or when Fabric is unavailable).
 * Produces a realistic rolling-window grid state instead of ever-growing sums.
 * Each participant's latest reading is tracked; the aggregate reflects only the
 * most-recent reading per participant (same semantics as a real UTXO-style ledger
 * read of current state).
 */

import { randomUUID } from 'crypto';
import { broadcast } from './ws';

// ── Types (mirrors chaincode types exactly) ──────────────────────────────────

export type ParticipantRole = 'utility' | 'solar_farm' | 'battery_operator' | 'sensor';
export type GridEventSeverity = 'info' | 'warning' | 'critical';
export type GridEventType =
  | 'OUTAGE' | 'SURGE' | 'FREQUENCY_DEVIATION' | 'VOLTAGE_SAP'
  | 'DEMAND_SPIKE' | 'SUPPLY_SHORTFALL' | 'RECONNECTION' | 'ANOMALY';

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
  blockHeight: number;
  txId: string;
}

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
  blockHeight: number;
}

export interface ParticipantSnapshot {
  participantId: string;
  role: ParticipantRole;
  supplyKW: number;
  demandKW: number;
  voltageV: number;
  frequencyHz: number;
  lastUpdated: string;
}

// ── Anomaly thresholds ────────────────────────────────────────────────────────

const THRESHOLDS = {
  frequencyDeviationHz: 0.5,
  voltageDeviationPct: 0.10,
  nominalFrequencyHz: 50,
  nominalVoltageV: 230,
  maxImbalancePct: 0.20,
} as const;

// ── Store state ───────────────────────────────────────────────────────────────

/** All readings, newest first. Capped at 2000 for memory. */
const readings: EnergyReading[] = [];
const MAX_READINGS = 2000;

/** All events, newest first. */
const events: GridEvent[] = [];

/** Latest reading per participant — used for accurate grid state aggregation. */
const latestByParticipant = new Map<string, EnergyReading>();

/** Simulated block counter */
let blockHeight = 1;

function nextBlock(): number {
  return ++blockHeight;
}

// ── Grid state computation ────────────────────────────────────────────────────

function computeGridState(): GridState {
  const snapshots = Array.from(latestByParticipant.values());
  if (snapshots.length === 0) {
    return {
      totalSupplyKW: 0,
      totalDemandKW: 0,
      netBalanceKW: 0,
      avgFrequencyHz: THRESHOLDS.nominalFrequencyHz,
      avgVoltageV: THRESHOLDS.nominalVoltageV,
      activeParticipants: [],
      unresolvedEventCount: events.filter((e) => !e.resolved).length,
      lastUpdated: new Date().toISOString(),
      blockHeight,
    };
  }

  const totalSupplyKW = snapshots.reduce((s, r) => s + r.supplyKW, 0);
  const totalDemandKW = snapshots.reduce((s, r) => s + r.demandKW, 0);
  const avgFrequencyHz = snapshots.reduce((s, r) => s + r.frequencyHz, 0) / snapshots.length;
  const avgVoltageV = snapshots.reduce((s, r) => s + r.voltageV, 0) / snapshots.length;

  return {
    totalSupplyKW: parseFloat(totalSupplyKW.toFixed(2)),
    totalDemandKW: parseFloat(totalDemandKW.toFixed(2)),
    netBalanceKW: parseFloat((totalSupplyKW - totalDemandKW).toFixed(2)),
    avgFrequencyHz: parseFloat(avgFrequencyHz.toFixed(3)),
    avgVoltageV: parseFloat(avgVoltageV.toFixed(1)),
    activeParticipants: snapshots.map((r) => r.participantId),
    unresolvedEventCount: events.filter((e) => !e.resolved).length,
    lastUpdated: new Date().toISOString(),
    blockHeight,
  };
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

/** Rate-limit: only emit one anomaly of a given type per participant per window */
const recentAnomalyWindow = new Map<string, number>(); // key → last emit timestamp
const ANOMALY_COOLDOWN_MS = 10_000;

function canEmit(participantId: string, type: GridEventType): boolean {
  const key = `${participantId}:${type}`;
  const last = recentAnomalyWindow.get(key) ?? 0;
  if (Date.now() - last < ANOMALY_COOLDOWN_MS) return false;
  recentAnomalyWindow.set(key, Date.now());
  return true;
}

function detectAnomalies(reading: EnergyReading, state: GridState): GridEvent[] {
  const emitted: GridEvent[] = [];
  const ts = reading.timestamp;

  const emit = (
    type: GridEventType,
    severity: GridEventSeverity,
    description: string,
  ): void => {
    if (!canEmit(reading.participantId, type)) return;
    const event: GridEvent = {
      id: `evt-${randomUUID()}`,
      type,
      severity,
      participantId: reading.participantId,
      sensorId: reading.sensorId,
      description,
      triggeringReadingId: reading.id,
      timestamp: ts,
      resolved: false,
    };
    events.unshift(event);
    emitted.push(event);
    broadcast({ type: 'grid_event', payload: event });
  };

  // Frequency deviation
  const freqDev = Math.abs(reading.frequencyHz - THRESHOLDS.nominalFrequencyHz);
  if (freqDev > THRESHOLDS.frequencyDeviationHz) {
    emit(
      'FREQUENCY_DEVIATION',
      freqDev > THRESHOLDS.frequencyDeviationHz * 2 ? 'critical' : 'warning',
      `Frequency ${reading.frequencyHz.toFixed(3)} Hz — deviation ${freqDev.toFixed(3)} Hz from nominal 50 Hz`,
    );
  }

  // Voltage deviation
  const voltDev = Math.abs(reading.voltageV - THRESHOLDS.nominalVoltageV) / THRESHOLDS.nominalVoltageV;
  if (voltDev > THRESHOLDS.voltageDeviationPct) {
    emit(
      reading.voltageV < THRESHOLDS.nominalVoltageV ? 'VOLTAGE_SAP' : 'SURGE',
      voltDev > 0.2 ? 'critical' : 'warning',
      `Voltage ${reading.voltageV.toFixed(1)} V — ${(voltDev * 100).toFixed(1)}% deviation from nominal 230 V`,
    );
  }

  // Supply/demand imbalance
  if (state.totalDemandKW > 0) {
    const imbalance = Math.abs(state.netBalanceKW) / state.totalDemandKW;
    if (imbalance > THRESHOLDS.maxImbalancePct) {
      emit(
        state.netBalanceKW < 0 ? 'SUPPLY_SHORTFALL' : 'DEMAND_SPIKE',
        imbalance > 0.35 ? 'critical' : 'warning',
        `Net balance ${state.netBalanceKW.toFixed(1)} kW — ${(imbalance * 100).toFixed(1)}% imbalance`,
      );
    }
  }

  return emitted;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface SubmitReadingInput {
  sensorId: string;
  participantId: string;
  role: ParticipantRole;
  supplyKW: number;
  demandKW: number;
  voltageV: number;
  frequencyHz: number;
}

export function submitReading(input: SubmitReadingInput): {
  readingId: string;
  blockHeight: number;
  txId: string;
  emittedEventIds: string[];
} {
  const txId = randomUUID();
  const block = nextBlock();
  const reading: EnergyReading = {
    id: `rdg-${txId}`,
    sensorId: input.sensorId,
    participantId: input.participantId,
    role: input.role,
    supplyKW: input.supplyKW,
    demandKW: input.demandKW,
    voltageV: input.voltageV,
    frequencyHz: input.frequencyHz,
    timestamp: new Date().toISOString(),
    blockHeight: block,
    txId,
  };

  readings.unshift(reading);
  if (readings.length > MAX_READINGS) readings.splice(MAX_READINGS);

  latestByParticipant.set(input.participantId, reading);

  const state = computeGridState();
  const newEvents = detectAnomalies(reading, state);

  // Broadcast new reading
  broadcast({ type: 'new_reading', payload: reading });
  // Broadcast updated grid state after each reading
  broadcast({ type: 'grid_state', payload: state });

  return {
    readingId: reading.id,
    blockHeight: block,
    txId,
    emittedEventIds: newEvents.map((e) => e.id),
  };
}

export function getGridState(): GridState {
  return computeGridState();
}

export function getReadingsByParticipant(participantId: string, limit = 100): EnergyReading[] {
  return readings
    .filter((r) => r.participantId === participantId)
    .slice(0, limit);
}

export function getAllReadings(limit = 200): EnergyReading[] {
  return readings.slice(0, limit);
}

export function getActiveEvents(): GridEvent[] {
  return events.filter((e) => !e.resolved);
}

export function getAllEvents(limit = 100): GridEvent[] {
  return events.slice(0, limit);
}

export function resolveEvent(eventId: string): void {
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error(`Event ${eventId} not found`);
  event.resolved = true;
  event.resolvedAt = new Date().toISOString();
  broadcast({ type: 'event_resolved', payload: { eventId } });
  broadcast({ type: 'grid_state', payload: computeGridState() });
}

export function getParticipantSnapshots(): ParticipantSnapshot[] {
  return Array.from(latestByParticipant.values()).map((r) => ({
    participantId: r.participantId,
    role: r.role,
    supplyKW: r.supplyKW,
    demandKW: r.demandKW,
    voltageV: r.voltageV,
    frequencyHz: r.frequencyHz,
    lastUpdated: r.timestamp,
  }));
}

export function getNetworkStats(): {
  blockHeight: number;
  totalReadings: number;
  totalEvents: number;
  unresolvedEvents: number;
  organizations: string[];
  tps: number;
} {
  // Estimate TPS from readings in the last 60 seconds
  const sixtySecondsAgo = Date.now() - 60_000;
  const recentCount = readings.filter(
    (r) => new Date(r.timestamp).getTime() > sixtySecondsAgo,
  ).length;
  const tps = parseFloat((recentCount / 60).toFixed(2));

  return {
    blockHeight,
    totalReadings: readings.length,
    totalEvents: events.length,
    unresolvedEvents: events.filter((e) => !e.resolved).length,
    organizations: ['UtilityOrg', 'SolarFarmOrg', 'BatteryOperatorOrg'],
    tps,
  };
}
