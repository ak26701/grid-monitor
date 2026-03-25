import { useEffect } from 'react';
import { GridStatusCard } from './components/GridStatusCard';
import { ReadingsChart } from './components/ReadingsChart';
import { AnomalyPanel } from './components/AnomalyPanel';
import { useGridData } from './hooks/useGridData';
import { useGridWebSocket } from './hooks/useGridWebSocket';

export default function App() {
  const {
    gridState, events, readingsAll, participants, connectionStatus,
    fetchInitialData, handleWsMessage, resolveEvent, setConnectionStatus,
  } = useGridData();

  // Load initial data on mount
  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Subscribe to live updates
  useGridWebSocket(handleWsMessage, setConnectionStatus);

  const connected = connectionStatus === 'connected';

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Grid Monitor</h1>
          <span className="subtitle">Decentralized Energy Ledger</span>
        </div>
        <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? 'Ledger Connected' : 'Connecting...'}
        </div>
      </header>

      <main className="dashboard">
        <GridStatusCard state={gridState} participants={participants} />
        <ReadingsChart readings={readingsAll} />
        <AnomalyPanel events={events} onResolve={resolveEvent} />
      </main>
    </div>
  );
}
