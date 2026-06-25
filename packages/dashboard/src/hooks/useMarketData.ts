import { useState, useCallback } from 'react';
import { ComputeProvider, AICompany, MarketIndex, MarketMatch, MarketAlert, PricePoint } from '../types';

export interface MarketState {
  providers: ComputeProvider[];
  companies: AICompany[];
  index: MarketIndex | null;
  matches: MarketMatch[];
  alerts: MarketAlert[];
  liveIndex: PricePoint | null;
  connected: boolean;
}

const initial: MarketState = {
  providers: [],
  companies: [],
  index: null,
  matches: [],
  alerts: [],
  liveIndex: null,
  connected: false,
};

export function useMarketData() {
  const [state, setState] = useState<MarketState>(initial);

  const fetchAll = useCallback(async () => {
    try {
      const [supplyRes, demandRes, indexRes, matchesRes, alertsRes] = await Promise.all([
        fetch('/api/supply'),
        fetch('/api/demand'),
        fetch('/api/market/index'),
        fetch('/api/matches'),
        fetch('/api/market/alerts'),
      ]);
      const [providers, companies, index, matches, alerts] = await Promise.all([
        supplyRes.json() as Promise<ComputeProvider[]>,
        demandRes.json() as Promise<AICompany[]>,
        indexRes.json() as Promise<MarketIndex>,
        matchesRes.json() as Promise<MarketMatch[]>,
        alertsRes.json() as Promise<MarketAlert[]>,
      ]);
      setState(s => ({ ...s, providers, companies, index, matches, alerts, liveIndex: index.current }));
    } catch (e) {
      console.error('[data] fetch failed:', e);
    }
  }, []);

  const handlePriceUpdate = useCallback((payload: { index: PricePoint }) => {
    setState(s => ({ ...s, liveIndex: payload.index }));
  }, []);

  const handleNewAlert = useCallback((alert: MarketAlert) => {
    setState(s => ({ ...s, alerts: [alert, ...s.alerts].slice(0, 50) }));
  }, []);

  const setConnected = useCallback((connected: boolean) => {
    setState(s => ({ ...s, connected }));
  }, []);

  return { state, fetchAll, handlePriceUpdate, handleNewAlert, setConnected };
}
