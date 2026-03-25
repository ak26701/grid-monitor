import { Contract, Context } from 'fabric-contract-api';
import {
  EnergyReading,
  GridEvent,
  GridState,
  GridEventType,
  GridEventSeverity,
  ANOMALY_THRESHOLDS,
} from './types';

/** Wraps the Fabric stub to provide typed helpers */
async function getState<T>(ctx: Context, key: string): Promise<T | null> {
  const bytes = await ctx.stub.getState(key);
  if (!bytes || bytes.length === 0) return null;
  return JSON.parse(bytes.toString()) as T;
}

async function putState(ctx: Context, key: string, value: unknown): Promise<void> {
  await ctx.stub.putState(key, Buffer.from(JSON.stringify(value)));
}

function now(ctx: Context): string {
  return new Date(ctx.stub.getTxTimestamp().seconds.toNumber() * 1000).toISOString();
}

function uuid(ctx: Context, suffix: string): string {
  return `${ctx.stub.getTxID()}-${suffix}`;
}

export class GridMonitorContract extends Contract {
  constructor() {
    super('GridMonitorContract');
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  async InitLedger(ctx: Context): Promise<void> {
    const state: GridState = {
      docType: 'grid_state',
      id: 'CURRENT_STATE',
      totalSupplyKW: 0,
      totalDemandKW: 0,
      netBalanceKW: 0,
      avgFrequencyHz: ANOMALY_THRESHOLDS.nominalFrequencyHz,
      avgVoltageV: ANOMALY_THRESHOLDS.nominalVoltageV,
      activeParticipants: [],
      unresolvedEventCount: 0,
      lastUpdated: now(ctx),
    };
    await putState(ctx, 'CURRENT_STATE', state);
  }

  // ---------------------------------------------------------------------------
  // Energy Readings
  // ---------------------------------------------------------------------------

  /**
   * SubmitReading — called by IoT sensor adapters.
   * Persists the reading, updates the aggregate grid state, and fires anomaly
   * detection.  Returns any GridEvent IDs emitted.
   */
  async SubmitReading(
    ctx: Context,
    sensorId: string,
    participantId: string,
    role: string,
    supplyKWStr: string,
    demandKWStr: string,
    voltageVStr: string,
    frequencyHzStr: string,
  ): Promise<string> {
    const readingId = uuid(ctx, 'rdg');
    const timestamp = now(ctx);

    const reading: EnergyReading = {
      docType: 'energy_reading',
      id: readingId,
      sensorId,
      participantId,
      role: role as EnergyReading['role'],
      supplyKW: parseFloat(supplyKWStr),
      demandKW: parseFloat(demandKWStr),
      voltageV: parseFloat(voltageVStr),
      frequencyHz: parseFloat(frequencyHzStr),
      timestamp,
    };

    const compositeKey = ctx.stub.createCompositeKey('READING', [sensorId, timestamp, readingId]);
    await putState(ctx, compositeKey, reading);

    // Also index by participant
    const participantKey = ctx.stub.createCompositeKey('READING~PARTICIPANT', [participantId, timestamp, readingId]);
    await putState(ctx, participantKey, { ref: compositeKey });

    // Update aggregate state and detect anomalies
    const emittedEventIds = await this._updateGridState(ctx, reading);

    ctx.stub.setEvent('ReadingSubmitted', Buffer.from(JSON.stringify({ readingId, participantId, timestamp })));

    return JSON.stringify({ readingId, emittedEventIds });
  }

  async GetReading(ctx: Context, compositeKey: string): Promise<string> {
    const reading = await getState<EnergyReading>(ctx, compositeKey);
    if (!reading) throw new Error(`Reading ${compositeKey} not found`);
    return JSON.stringify(reading);
  }

  /** Returns last N readings across all sensors (rich query — requires CouchDB). */
  async QueryReadingsByParticipant(ctx: Context, participantId: string): Promise<string> {
    const query = {
      selector: {
        docType: 'energy_reading',
        participantId,
      },
      sort: [{ timestamp: 'desc' }],
      limit: 100,
    };
    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const results: EnergyReading[] = [];
    while (true) {
      const res = await iterator.next();
      if (res.done) break;
      results.push(JSON.parse(res.value.value.toString()) as EnergyReading);
    }
    await iterator.close();
    return JSON.stringify(results);
  }

  // ---------------------------------------------------------------------------
  // Grid State
  // ---------------------------------------------------------------------------

  async GetGridState(ctx: Context): Promise<string> {
    const state = await getState<GridState>(ctx, 'CURRENT_STATE');
    if (!state) throw new Error('Grid state not initialised. Call InitLedger first.');
    return JSON.stringify(state);
  }

  // ---------------------------------------------------------------------------
  // Grid Events
  // ---------------------------------------------------------------------------

  async GetActiveEvents(ctx: Context): Promise<string> {
    const query = {
      selector: {
        docType: 'grid_event',
        resolved: false,
      },
      sort: [{ timestamp: 'desc' }],
    };
    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const events: GridEvent[] = [];
    while (true) {
      const res = await iterator.next();
      if (res.done) break;
      events.push(JSON.parse(res.value.value.toString()) as GridEvent);
    }
    await iterator.close();
    return JSON.stringify(events);
  }

  async ResolveEvent(ctx: Context, eventId: string): Promise<void> {
    const key = ctx.stub.createCompositeKey('EVENT', [eventId]);
    const event = await getState<GridEvent>(ctx, key);
    if (!event) throw new Error(`Event ${eventId} not found`);
    event.resolved = true;
    event.resolvedAt = now(ctx);
    await putState(ctx, key, event);

    const state = await getState<GridState>(ctx, 'CURRENT_STATE');
    if (state && state.unresolvedEventCount > 0) {
      state.unresolvedEventCount -= 1;
      state.lastUpdated = now(ctx);
      await putState(ctx, 'CURRENT_STATE', state);
    }

    ctx.stub.setEvent('EventResolved', Buffer.from(JSON.stringify({ eventId })));
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async _updateGridState(ctx: Context, reading: EnergyReading): Promise<string[]> {
    const state = (await getState<GridState>(ctx, 'CURRENT_STATE')) ?? {
      docType: 'grid_state' as const,
      id: 'CURRENT_STATE' as const,
      totalSupplyKW: 0,
      totalDemandKW: 0,
      netBalanceKW: 0,
      avgFrequencyHz: ANOMALY_THRESHOLDS.nominalFrequencyHz,
      avgVoltageV: ANOMALY_THRESHOLDS.nominalVoltageV,
      activeParticipants: [],
      unresolvedEventCount: 0,
      lastUpdated: now(ctx),
    };

    // Rolling update — simple additive model; a production system would use
    // time-windowed aggregates stored per-participant.
    state.totalSupplyKW += reading.supplyKW;
    state.totalDemandKW += reading.demandKW;
    state.netBalanceKW = state.totalSupplyKW - state.totalDemandKW;
    state.avgFrequencyHz = (state.avgFrequencyHz + reading.frequencyHz) / 2;
    state.avgVoltageV = (state.avgVoltageV + reading.voltageV) / 2;

    if (!state.activeParticipants.includes(reading.participantId)) {
      state.activeParticipants.push(reading.participantId);
    }

    const emittedIds = await this._detectAndEmitAnomalies(ctx, reading, state);
    state.unresolvedEventCount += emittedIds.length;
    state.lastUpdated = now(ctx);

    await putState(ctx, 'CURRENT_STATE', state);
    return emittedIds;
  }

  private async _detectAndEmitAnomalies(
    ctx: Context,
    reading: EnergyReading,
    state: GridState,
  ): Promise<string[]> {
    const emitted: string[] = [];

    const emit = async (
      type: GridEventType,
      severity: GridEventSeverity,
      description: string,
    ) => {
      const eventId = uuid(ctx, `evt-${emitted.length}`);
      const event: GridEvent = {
        docType: 'grid_event',
        id: eventId,
        type,
        severity,
        participantId: reading.participantId,
        sensorId: reading.sensorId,
        description,
        triggeringReadingId: reading.id,
        timestamp: reading.timestamp,
        resolved: false,
      };
      const key = ctx.stub.createCompositeKey('EVENT', [eventId]);
      await putState(ctx, key, event);
      ctx.stub.setEvent('GridEvent', Buffer.from(JSON.stringify(event)));
      emitted.push(eventId);
    };

    // Frequency deviation
    const freqDev = Math.abs(reading.frequencyHz - ANOMALY_THRESHOLDS.nominalFrequencyHz);
    if (freqDev > ANOMALY_THRESHOLDS.frequencyDeviationHz) {
      await emit(
        'FREQUENCY_DEVIATION',
        freqDev > ANOMALY_THRESHOLDS.frequencyDeviationHz * 2 ? 'critical' : 'warning',
        `Frequency ${reading.frequencyHz.toFixed(2)} Hz deviates ${freqDev.toFixed(2)} Hz from nominal`,
      );
    }

    // Voltage deviation
    const voltDev = Math.abs(reading.voltageV - ANOMALY_THRESHOLDS.nominalVoltageV)
      / ANOMALY_THRESHOLDS.nominalVoltageV;
    if (voltDev > ANOMALY_THRESHOLDS.voltageDeviationPct) {
      await emit(
        reading.voltageV < ANOMALY_THRESHOLDS.nominalVoltageV ? 'VOLTAGE_SAP' : 'SURGE',
        voltDev > 0.2 ? 'critical' : 'warning',
        `Voltage ${reading.voltageV.toFixed(1)} V (${(voltDev * 100).toFixed(1)}% deviation)`,
      );
    }

    // Supply/demand imbalance — only evaluate when we have meaningful totals
    if (state.totalDemandKW > 0) {
      const imbalance = Math.abs(state.netBalanceKW) / state.totalDemandKW;
      if (imbalance > ANOMALY_THRESHOLDS.maxImbalancePct) {
        await emit(
          state.netBalanceKW < 0 ? 'SUPPLY_SHORTFALL' : 'DEMAND_SPIKE',
          imbalance > 0.35 ? 'critical' : 'warning',
          `Net balance ${state.netBalanceKW.toFixed(1)} kW (${(imbalance * 100).toFixed(1)}% imbalance)`,
        );
      }
    }

    return emitted;
  }
}
