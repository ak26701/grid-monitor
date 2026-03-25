import { useState, useCallback } from 'react';
import { GridState, GridEvent, EnergyReading, WsMessage } from '../types';

const API = '/api';
const MAX_READINGS_HISTORY = 60;

export function useGridData() {
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [events, setEvents] = useState<GridEvent[]>([]);
  const [readingsHistory, setReadingsHistory] = useState<EnergyReading[]>([]);
  const [connected, setConnected] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const [stateRes, eventsRes] = await Promise.all([
        fetch(`${API}/grid/state`),
        fetch(`${API}/grid/events`),
      ]);
      if (stateRes.ok) setGridState(await stateRes.json() as GridState);
      if (eventsRes.ok) setEvents(await eventsRes.json() as GridEvent[]);
      setConnected(true);
    } catch (e) {
      console.error('Failed to fetch initial data', e);
    }
  }, []);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'grid_state':
        setGridState(msg.payload as GridState);
        break;
      case 'new_reading':
        setReadingsHistory((prev) => {
          const next = [msg.payload as EnergyReading, ...prev];
          return next.slice(0, MAX_READINGS_HISTORY);
        });
        break;
      case 'grid_event':
        setEvents((prev) => [msg.payload as GridEvent, ...prev]);
        break;
      case 'event_resolved': {
        const { eventId } = msg.payload as { eventId: string };
        setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, resolved: true } : e));
        break;
      }
    }
  }, []);

  const resolveEvent = useCallback(async (eventId: string) => {
    await fetch(`${API}/grid/events/${eventId}/resolve`, { method: 'POST' });
  }, []);

  return { gridState, events, readingsHistory, connected, fetchInitialData, handleWsMessage, resolveEvent };
}
