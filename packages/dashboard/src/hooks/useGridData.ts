import { useState, useCallback, useRef } from 'react';
import {
  GridState, GridEvent, EnergyReading, WsMessage,
  ParticipantSnapshot, NetworkStats,
} from '../types';

const API = '/api';
const MAX_READINGS_PER_PARTICIPANT = 80;
const MAX_ALL_READINGS = 300;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface GridDataState {
  gridState: GridState | null;
  events: GridEvent[];
  /** All readings newest-first, capped to MAX_ALL_READINGS */
  readingsAll: EnergyReading[];
  /** Per-participant reading history, keyed by participantId */
  readingsByParticipant: Record<string, EnergyReading[]>;
  participants: ParticipantSnapshot[];
  networkStats: NetworkStats | null;
  connectionStatus: ConnectionStatus;
}

export interface GridDataActions {
  fetchInitialData: () => Promise<void>;
  handleWsMessage: (msg: WsMessage) => void;
  resolveEvent: (eventId: string) => Promise<void>;
  setConnectionStatus: (s: ConnectionStatus) => void;
}

function addToHistory(
  prev: EnergyReading[],
  reading: EnergyReading,
  max: number,
): EnergyReading[] {
  const next = [reading, ...prev];
  return next.slice(0, max);
}

export function useGridData(): GridDataState & GridDataActions {
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [events, setEvents] = useState<GridEvent[]>([]);
  const [readingsAll, setReadingsAll] = useState<EnergyReading[]>([]);
  const [readingsByParticipant, setReadingsByParticipant] = useState<Record<string, EnergyReading[]>>({});
  const [participants, setParticipants] = useState<ParticipantSnapshot[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  // Used to refresh network stats periodically
  const networkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNetworkStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/grid/network`);
      if (res.ok) setNetworkStats(await res.json() as NetworkStats);
    } catch { /* silent */ }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [stateRes, eventsRes, participantsRes, readingsRes] = await Promise.all([
        fetch(`${API}/grid/state`),
        fetch(`${API}/grid/events`),
        fetch(`${API}/grid/participants`),
        fetch(`${API}/readings`),
      ]);

      if (stateRes.ok) setGridState(await stateRes.json() as GridState);
      if (eventsRes.ok) setEvents(await eventsRes.json() as GridEvent[]);
      if (participantsRes.ok) setParticipants(await participantsRes.json() as ParticipantSnapshot[]);
      if (readingsRes.ok) {
        const all = await readingsRes.json() as EnergyReading[];
        setReadingsAll(all.slice(0, MAX_ALL_READINGS));
        const byP: Record<string, EnergyReading[]> = {};
        for (const r of all) {
          if (!byP[r.participantId]) byP[r.participantId] = [];
          if (byP[r.participantId].length < MAX_READINGS_PER_PARTICIPANT) {
            byP[r.participantId].push(r);
          }
        }
        setReadingsByParticipant(byP);
      }

      setConnectionStatus('connected');
    } catch (e) {
      console.error('Failed to fetch initial data', e);
      setConnectionStatus('disconnected');
    }

    void fetchNetworkStats();

    if (networkPollRef.current) clearInterval(networkPollRef.current);
    networkPollRef.current = setInterval(() => { void fetchNetworkStats(); }, 5000);
  }, [fetchNetworkStats]);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'grid_state': {
        setGridState(msg.payload as GridState);
        break;
      }
      case 'new_reading': {
        const reading = msg.payload as EnergyReading;
        setReadingsAll((prev) => addToHistory(prev, reading, MAX_ALL_READINGS));
        setReadingsByParticipant((prev) => ({
          ...prev,
          [reading.participantId]: addToHistory(
            prev[reading.participantId] ?? [],
            reading,
            MAX_READINGS_PER_PARTICIPANT,
          ),
        }));
        // Update participant snapshot inline from the reading
        setParticipants((prev) => {
          const idx = prev.findIndex((p) => p.participantId === reading.participantId);
          const snap: ParticipantSnapshot = {
            participantId: reading.participantId,
            role: reading.role,
            supplyKW: reading.supplyKW,
            demandKW: reading.demandKW,
            voltageV: reading.voltageV,
            frequencyHz: reading.frequencyHz,
            lastUpdated: reading.timestamp,
          };
          if (idx === -1) return [...prev, snap];
          const next = [...prev];
          next[idx] = snap;
          return next;
        });
        break;
      }
      case 'grid_event': {
        setEvents((prev) => [msg.payload as GridEvent, ...prev]);
        break;
      }
      case 'event_resolved': {
        const { eventId } = msg.payload as { eventId: string };
        setEvents((prev) =>
          prev.map((e) => e.id === eventId ? { ...e, resolved: true, resolvedAt: new Date().toISOString() } : e),
        );
        break;
      }
    }
  }, []);

  const resolveEvent = useCallback(async (eventId: string) => {
    await fetch(`${API}/grid/events/${eventId}/resolve`, { method: 'POST' });
  }, []);

  return {
    gridState,
    events,
    readingsAll,
    readingsByParticipant,
    participants,
    networkStats,
    connectionStatus,
    fetchInitialData,
    handleWsMessage,
    resolveEvent,
    setConnectionStatus,
  };
}
