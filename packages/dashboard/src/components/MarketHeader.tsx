import { PricePoint, MarketIndex } from '../types';

interface Props {
  liveIndex: PricePoint | null;
  marketData: MarketIndex | null;
  connected: boolean;
}

function Delta({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span style={{ color: up ? '#ef4444' : '#10b981', fontSize: 13, fontWeight: 600 }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export function MarketHeader({ liveIndex, marketData, connected }: Props) {
  const price = liveIndex?.h100OnDemand ?? marketData?.current.h100OnDemand;

  return (
    <header className="market-header">
      <div className="header-brand">
        <div className="brand-name">Compute Market Ops</div>
        <div className="brand-sub">GPU Market Intelligence · Ornn-Powered Index</div>
      </div>

      <div className="header-stats">
        <div className="stat-block">
          <div className="stat-label">H100 On-Demand Index</div>
          <div className="stat-value primary">
            {price != null ? `$${price.toFixed(3)}/hr` : '—'}
            {marketData && <span style={{ marginLeft: 10 }}><Delta pct={marketData.change24hPct} /></span>}
          </div>
        </div>

        <div className="stat-divider" />

        <div className="stat-block">
          <div className="stat-label">H100 Reserved</div>
          <div className="stat-value">{liveIndex?.h100Reserved != null ? `$${liveIndex.h100Reserved.toFixed(3)}/hr` : '—'}</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-block">
          <div className="stat-label">H100 Spot</div>
          <div className="stat-value">{liveIndex?.h100Spot != null ? `$${liveIndex.h100Spot.toFixed(3)}/hr` : '—'}</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-block">
          <div className="stat-label">Active Providers</div>
          <div className="stat-value">{marketData?.providerCount ?? '—'}</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-block">
          <div className="stat-label">Total H100 Supply</div>
          <div className="stat-value">{marketData ? `${(marketData.totalH100Supply / 1000).toFixed(0)}K` : '—'}</div>
        </div>

        <div className="stat-divider" />

        <div className="stat-block">
          <div className="stat-label">Avg Utilization</div>
          <div className="stat-value">{marketData ? `${marketData.avgUtilization}%` : '—'}</div>
        </div>
      </div>

      <div className={`connection-badge ${connected ? 'live' : 'offline'}`}>
        <span className="connection-dot-pulse" />
        {connected ? 'Live' : 'Reconnecting'}
      </div>
    </header>
  );
}
