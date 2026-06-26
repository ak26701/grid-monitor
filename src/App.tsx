import { useEffect, useState } from 'react';
import { MarketHeader } from './components/MarketHeader';
import { SupplyPanel } from './components/SupplyPanel';
import { DemandPanel } from './components/DemandPanel';
import { PriceIndexChart } from './components/PriceIndexChart';
import { MatchPanel } from './components/MatchPanel';
import { AlertPanel } from './components/AlertPanel';
import { useMarketData } from './hooks/useMarketData';
import { useWebSocket } from './hooks/useWebSocket';
import { TabId } from './types';

const TABS: { id: TabId; label: string; count?: (s: ReturnType<typeof useMarketData>['state']) => number }[] = [
  { id: 'supply',  label: 'Supply Side',  count: s => s.providers.length },
  { id: 'demand',  label: 'Demand Side',  count: s => s.companies.length },
  { id: 'market',  label: 'Market Index' },
  { id: 'matches', label: 'Matches',      count: s => s.matches.length },
  { id: 'alerts',  label: 'Intel Feed',   count: s => s.alerts.filter(a => a.severity === 'opportunity').length },
];

export default function App() {
  const [tab, setTab] = useState<TabId>('supply');
  const { state, fetchAll, handlePriceUpdate, handleNewAlert, setConnected } = useMarketData();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useWebSocket({
    onPriceUpdate: handlePriceUpdate,
    onNewAlert: handleNewAlert,
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
  });

  return (
    <div className="app">
      <MarketHeader
        liveIndex={state.liveIndex}
        marketData={state.index}
        connected={state.connected}
      />

      <nav className="tab-nav">
        {TABS.map(t => {
          const cnt = t.count?.(state);
          return (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {cnt != null && (
                <span className={`tab-count ${tab === t.id ? 'active' : ''}`}>{cnt}</span>
              )}
            </button>
          );
        })}
      </nav>

      <main className="main-content">
        {tab === 'supply'  && <SupplyPanel providers={state.providers} />}
        {tab === 'demand'  && <DemandPanel companies={state.companies} />}
        {tab === 'market'  && <PriceIndexChart marketData={state.index} />}
        {tab === 'matches' && <MatchPanel matches={state.matches} />}
        {tab === 'alerts'  && <AlertPanel alerts={state.alerts} />}
      </main>
    </div>
  );
}
