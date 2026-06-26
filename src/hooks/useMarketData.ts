import { useState, useCallback, useEffect, useRef } from 'react';
import { ComputeProvider, AICompany, MarketIndex, MarketMatch, MarketAlert, PricePoint } from '../types';
import { providers as staticProviders } from '../data/providers';
import { companies as staticCompanies } from '../data/companies';
import { matches as staticMatches } from '../data/matches';
import { seedAlerts, alertPool } from '../data/alerts';

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
  providers: [], companies: [], index: null, matches: [],
  alerts: [], liveIndex: null, connected: false,
};

// ── Price simulation helpers ──────────────────────────────────────────────────

type LivePrices = Record<string, Record<string, number>>;

function initPrices(ps: ComputeProvider[]): LivePrices {
  const prices: LivePrices = {};
  for (const p of ps) {
    prices[p.id] = {};
    for (const inv of p.inventory) {
      prices[p.id][`${inv.model}_od`] = inv.priceOnDemand;
      if (inv.priceReserved) prices[p.id][`${inv.model}_rs`] = inv.priceReserved;
      if (inv.priceSpot)     prices[p.id][`${inv.model}_sp`] = inv.priceSpot;
    }
  }
  return prices;
}

function walk(v: number, maxPct = 0.003): number {
  const d = v * (Math.random() * maxPct * 2 - maxPct);
  return Math.round((v + d) * 1000) / 1000;
}

function computeIndex(ps: ComputeProvider[], prices: LivePrices): PricePoint {
  let wOD = 0, wRS = 0, wSP = 0, wH2 = 0, tw = 0, h2w = 0;
  for (const p of ps) {
    for (const inv of p.inventory) {
      if (inv.model === 'H100_SXM5' || inv.model === 'H100_PCIe') {
        const w = inv.totalUnits;
        wOD += (prices[p.id]?.[`${inv.model}_od`] ?? inv.priceOnDemand) * w;
        wRS += (prices[p.id]?.[`${inv.model}_rs`] ?? inv.priceOnDemand * 0.78) * w;
        wSP += (prices[p.id]?.[`${inv.model}_sp`] ?? inv.priceOnDemand * 0.60) * w;
        tw += w;
      }
      if (inv.model === 'H200') {
        wH2 += (prices[p.id]?.[`${inv.model}_od`] ?? inv.priceOnDemand) * inv.totalUnits;
        h2w += inv.totalUnits;
      }
    }
  }
  return {
    timestamp: new Date().toISOString(),
    h100OnDemand: Math.round((wOD / tw) * 1000) / 1000,
    h100Reserved: Math.round((wRS / tw) * 1000) / 1000,
    h100Spot:     Math.round((wSP / tw) * 1000) / 1000,
    h200OnDemand: h2w > 0 ? Math.round((wH2 / h2w) * 1000) / 1000 : 4.35,
  };
}

function buildHistory(ps: ComputeProvider[], prices: LivePrices): PricePoint[] {
  const base = computeIndex(ps, prices);
  const now = Date.now();
  return Array.from({ length: 49 }, (_, i) => {
    const drift = (Math.random() - 0.5) * 0.04;
    return {
      timestamp: new Date(now - (48 - i) * 3600000).toISOString(),
      h100OnDemand: Math.round(base.h100OnDemand * (1 + drift) * 1000) / 1000,
      h100Reserved: Math.round(base.h100Reserved * (1 + drift * 0.6) * 1000) / 1000,
      h100Spot:     Math.round(base.h100Spot * (1 + drift * 1.4) * 1000) / 1000,
      h200OnDemand: Math.round(base.h200OnDemand * (1 + drift * 0.5) * 1000) / 1000,
    };
  });
}

function buildMarketIndex(ps: ComputeProvider[], prices: LivePrices): MarketIndex {
  const current = computeIndex(ps, prices);
  const history = buildHistory(ps, prices);
  const oldest = history[0];
  const change24h = oldest
    ? ((current.h100OnDemand - oldest.h100OnDemand) / oldest.h100OnDemand) * 100
    : 0;
  const totalH100 = ps.reduce((s, p) =>
    s + p.inventory.filter(i => i.model === 'H100_SXM5' || i.model === 'H100_PCIe')
      .reduce((ss, i) => ss + i.totalUnits, 0), 0);
  const avgUtil = ps.reduce((s, p) => s + p.utilizationPct, 0) / ps.length;

  return {
    current,
    change24hPct: Math.round(change24h * 100) / 100,
    change7dPct: -1.2,
    history,
    providerCount: ps.length,
    totalH100Supply: totalH100,
    avgUtilization: Math.round(avgUtil * 10) / 10,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMarketData() {
  const [state, setState] = useState<MarketState>(initial);
  const livePricesRef = useRef<LivePrices>({});
  const alertCounterRef = useRef(0);
  const alertPoolIdxRef = useRef(0);

  // Try loading from API; if unavailable fall back to static data + client simulation
  const fetchAll = useCallback(async () => {
    try {
      const [supplyRes, demandRes, indexRes, matchesRes, alertsRes] = await Promise.all([
        fetch('/api/supply'),
        fetch('/api/demand'),
        fetch('/api/market/index'),
        fetch('/api/matches'),
        fetch('/api/market/alerts'),
      ]);

      if (!supplyRes.ok) throw new Error('API unavailable');

      const [providers, companies, index, matches, alerts] = await Promise.all([
        supplyRes.json() as Promise<ComputeProvider[]>,
        demandRes.json() as Promise<AICompany[]>,
        indexRes.json() as Promise<MarketIndex>,
        matchesRes.json() as Promise<MarketMatch[]>,
        alertsRes.json() as Promise<MarketAlert[]>,
      ]);

      setState(s => ({ ...s, providers, companies, index, matches, alerts, liveIndex: index.current }));
    } catch {
      // Static fallback — runs on Vercel where there's no Express API
      const prices = initPrices(staticProviders);
      livePricesRef.current = prices;
      const index = buildMarketIndex(staticProviders, prices);

      setState(s => ({
        ...s,
        providers: staticProviders,
        companies: staticCompanies,
        index,
        matches: staticMatches,
        alerts: seedAlerts,
        liveIndex: index.current,
        connected: true,
      }));
    }
  }, []);

  // Client-side price simulation — runs when using static data (Vercel)
  useEffect(() => {
    if (state.providers.length === 0) return;
    if (Object.keys(livePricesRef.current).length === 0) return;

    const interval = setInterval(() => {
      const prices = livePricesRef.current;

      // Walk all prices
      for (const p of state.providers) {
        if (!prices[p.id]) continue;
        for (const inv of p.inventory) {
          const od = `${inv.model}_od`;
          const rs = `${inv.model}_rs`;
          const sp = `${inv.model}_sp`;
          if (prices[p.id][od]) prices[p.id][od] = walk(prices[p.id][od], 0.003);
          if (prices[p.id][rs]) prices[p.id][rs] = walk(prices[p.id][rs], 0.001);
          if (prices[p.id][sp]) prices[p.id][sp] = walk(prices[p.id][sp], 0.006);
        }
      }

      const newIndex = computeIndex(state.providers, prices);

      setState(s => ({
        ...s,
        liveIndex: newIndex,
        index: s.index ? { ...s.index, current: newIndex } : s.index,
      }));

      // Fire a random alert every ~40 ticks
      alertCounterRef.current++;
      if (alertCounterRef.current % 40 === 0) {
        const template = alertPool[alertPoolIdxRef.current % alertPool.length];
        alertPoolIdxRef.current++;
        const alert: MarketAlert = {
          ...template,
          id: `live-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
        setState(s => ({ ...s, alerts: [alert, ...s.alerts].slice(0, 50) }));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [state.providers]);

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
