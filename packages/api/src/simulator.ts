import { providers } from './data/providers';
import { PricePoint, MarketAlert } from './types';

export type PriceState = Record<string, Record<string, number>>;
export type AlertCallback = (alert: MarketAlert) => void;
export type PriceCallback = (prices: PriceState, index: PricePoint) => void;

let alertCallback: AlertCallback | null = null;
let priceCallback: PriceCallback | null = null;

export function onAlert(cb: AlertCallback) { alertCallback = cb; }
export function onPriceUpdate(cb: PriceCallback) { priceCallback = cb; }

// Live prices: providerID -> modelKey -> current price
export const livePrices: PriceState = {};

function initLivePrices() {
  for (const p of providers) {
    livePrices[p.id] = {};
    for (const inv of p.inventory) {
      livePrices[p.id][`${inv.model}_onDemand`] = inv.priceOnDemand;
      if (inv.priceReserved) livePrices[p.id][`${inv.model}_reserved`] = inv.priceReserved;
      if (inv.priceSpot) livePrices[p.id][`${inv.model}_spot`] = inv.priceSpot;
    }
  }
}

function randomWalk(current: number, maxPct = 0.003): number {
  const delta = current * (Math.random() * maxPct * 2 - maxPct);
  return Math.round((current + delta) * 1000) / 1000;
}

export function computeIndex(): PricePoint {
  let weightedOnDemand = 0;
  let weightedReserved = 0;
  let weightedSpot = 0;
  let weightedH200 = 0;
  let totalWeight = 0;

  for (const p of providers) {
    for (const inv of p.inventory) {
      if (inv.model === 'H100_SXM5' || inv.model === 'H100_PCIe') {
        const w = inv.totalUnits;
        const od = livePrices[p.id]?.[`${inv.model}_onDemand`] ?? inv.priceOnDemand;
        const rs = livePrices[p.id]?.[`${inv.model}_reserved`] ?? inv.priceReserved ?? od * 0.78;
        const sp = livePrices[p.id]?.[`${inv.model}_spot`] ?? inv.priceSpot ?? od * 0.60;
        weightedOnDemand += od * w;
        weightedReserved += rs * w;
        weightedSpot += sp * w;
        totalWeight += w;
      }
      if (inv.model === 'H200') {
        const w = inv.totalUnits;
        const od = livePrices[p.id]?.[`${inv.model}_onDemand`] ?? inv.priceOnDemand;
        weightedH200 += od * w;
      }
    }
  }

  const h200Weight = providers.reduce((s, p) => {
    const inv = p.inventory.find(i => i.model === 'H200');
    return s + (inv?.totalUnits ?? 0);
  }, 0);

  return {
    timestamp: new Date().toISOString(),
    h100OnDemand: Math.round((weightedOnDemand / totalWeight) * 1000) / 1000,
    h100Reserved: Math.round((weightedReserved / totalWeight) * 1000) / 1000,
    h100Spot: Math.round((weightedSpot / totalWeight) * 1000) / 1000,
    h200OnDemand: h200Weight > 0 ? Math.round((weightedH200 / h200Weight) * 1000) / 1000 : 4.35,
  };
}

export function generateHistory(hours = 48): PricePoint[] {
  const now = Date.now();
  const base = computeIndex();
  const history: PricePoint[] = [];

  for (let i = hours; i >= 0; i--) {
    const drift = (Math.random() - 0.5) * 0.04;
    history.push({
      timestamp: new Date(now - i * 3600 * 1000).toISOString(),
      h100OnDemand: Math.round((base.h100OnDemand * (1 + drift)) * 1000) / 1000,
      h100Reserved: Math.round((base.h100Reserved * (1 + drift * 0.6)) * 1000) / 1000,
      h100Spot: Math.round((base.h100Spot * (1 + drift * 1.4)) * 1000) / 1000,
      h200OnDemand: Math.round((base.h200OnDemand * (1 + drift * 0.5)) * 1000) / 1000,
    });
  }

  return history;
}

let alertIdCounter = 100;
const ALERT_POOL: Omit<MarketAlert, 'id' | 'timestamp'>[] = [
  {
    type: 'low_utilization',
    severity: 'opportunity',
    title: 'Voltage Park at 59% utilization — high receptivity window',
    description: 'Voltage Park has the lowest utilization in the market. ~3,280 H100 SXM5 units sitting idle. Now is the best time to initiate an offtake discussion before they lock in other arrangements.',
    affectedParty: 'Voltage Park',
    actionable: true,
  },
  {
    type: 'arbitrage',
    severity: 'opportunity',
    title: '$0.50/hr H100 spread between cheapest and most expensive provider',
    description: 'Voltage Park ($2.39/hr) vs CoreWeave ($2.89/hr) for identical H100 SXM5 on-demand capacity. A compute swap contract could lock in the spread for buyers with provider flexibility.',
    actionable: true,
  },
  {
    type: 'new_funding',
    severity: 'opportunity',
    title: 'Perplexity AI closes $250M Series C — compute ramp expected',
    description: 'Perplexity AI\'s April 2024 Series C signals aggressive scaling. With 100M+ MAU and inference-only workloads, Q3-Q4 reserved capacity will be critical. Urgency score: 91.',
    affectedParty: 'Perplexity AI',
    actionable: true,
  },
  {
    type: 'capacity_expansion',
    severity: 'info',
    title: 'Nebius brings 2,000 H200 units online in EU-Central',
    description: 'New Nebius capacity in Frankfurt increases EU H200 supply by ~34%. Aligns with Mistral AI and Aleph Alpha\'s EU-region compute preference.',
    affectedParty: 'Nebius',
    actionable: false,
  },
  {
    type: 'price_drop',
    severity: 'opportunity',
    title: 'H100 spot rates down 8% on RunPod over the past 48 hours',
    description: 'Spot price compression signals excess capacity in the market. Good entry point for buyers with flexible workloads. OCPI spot index now at $1.35/hr.',
    actionable: true,
  },
  {
    type: 'capacity_drought',
    severity: 'warning',
    title: 'CoreWeave H200 availability dropping — 80% utilized',
    description: 'CoreWeave H200 units approaching full utilization. AI labs requiring H200 for new model training may face lead times of 4–6 weeks. Reserved contracts needed immediately.',
    affectedParty: 'CoreWeave',
    actionable: true,
  },
];

let alertPoolIndex = 0;

function fireRandomAlert() {
  const alert: MarketAlert = {
    ...ALERT_POOL[alertPoolIndex % ALERT_POOL.length],
    id: `alert-${++alertIdCounter}`,
    timestamp: new Date().toISOString(),
  };
  alertPoolIndex++;
  alertCallback?.(alert);
}

let tickCount = 0;

function tick() {
  tickCount++;

  // Walk all prices
  for (const p of providers) {
    for (const inv of p.inventory) {
      const odKey = `${inv.model}_onDemand`;
      if (livePrices[p.id][odKey]) {
        livePrices[p.id][odKey] = randomWalk(livePrices[p.id][odKey]);
      }
      const rsKey = `${inv.model}_reserved`;
      if (livePrices[p.id][rsKey]) {
        livePrices[p.id][rsKey] = randomWalk(livePrices[p.id][rsKey], 0.001);
      }
      const spKey = `${inv.model}_spot`;
      if (livePrices[p.id][spKey]) {
        livePrices[p.id][spKey] = randomWalk(livePrices[p.id][spKey], 0.006);
      }
    }
  }

  const index = computeIndex();
  priceCallback?.(livePrices, index);

  // Fire an alert every ~40 ticks
  if (tickCount % 40 === 0) {
    fireRandomAlert();
  }
}

initLivePrices();
setInterval(tick, 3000);
console.log('[SIM] compute market simulator started — price updates every 3s');
