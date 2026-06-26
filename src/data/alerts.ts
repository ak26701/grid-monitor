import { MarketAlert } from '../types';

export const seedAlerts: MarketAlert[] = [
  {
    id: 'alert-1', type: 'low_utilization', severity: 'opportunity',
    title: 'Voltage Park at 59% utilization — high receptivity window',
    description: 'Voltage Park has the lowest utilization in the market. ~3,280 H100 SXM5 units sitting idle. Now is the ideal time to initiate an offtake discussion before they lock in other arrangements.',
    affectedParty: 'Voltage Park', actionable: true,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-2', type: 'arbitrage', severity: 'opportunity',
    title: '$0.50/hr spread between cheapest and most expensive H100 on-demand',
    description: 'Voltage Park ($2.39/hr) vs CoreWeave ($2.89/hr) for identical H100 SXM5 on-demand. A compute swap could lock in the spread for buyers with provider flexibility.',
    actionable: true,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-3', type: 'new_funding', severity: 'opportunity',
    title: 'Perplexity AI closes $250M Series C — compute ramp expected',
    description: 'With 100M+ MAU and inference-only workloads, Perplexity\'s Q3–Q4 reserved capacity will be critical. Compute urgency score: 91. Outreach window is now.',
    affectedParty: 'Perplexity AI', actionable: true,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-4', type: 'capacity_expansion', severity: 'info',
    title: 'Nebius brings 2,000 H200 units online in EU-Central',
    description: 'New Nebius capacity in Frankfurt increases EU H200 supply by ~34%. Directly addresses Mistral AI and Aleph Alpha\'s EU-region compute requirements.',
    affectedParty: 'Nebius', actionable: false,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-5', type: 'price_drop', severity: 'opportunity',
    title: 'H100 spot rates down 8% on RunPod over 48 hours',
    description: 'Spot price compression signals excess capacity. Good entry point for price-flexible buyers. OCPI H100 spot index now at $1.35/hr — lowest in 30 days.',
    actionable: true,
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-6', type: 'capacity_drought', severity: 'warning',
    title: 'CoreWeave H200 approaching full utilization',
    description: 'CoreWeave H200 units at 80% utilized and rising. AI labs requiring H200 for new model training may face 4–6 week lead times. Reserved contracts are urgently needed.',
    affectedParty: 'CoreWeave', actionable: true,
    timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
  },
];

export const alertPool: Omit<MarketAlert, 'id' | 'timestamp'>[] = [
  {
    type: 'low_utilization', severity: 'opportunity',
    title: 'Crusoe Energy at 67% utilization — offtake window open',
    description: 'Crusoe\'s below-average utilization creates strong motivation for a structured offtake agreement. Unique energy model (stranded gas) makes revenue certainty especially important.',
    affectedParty: 'Crusoe Energy', actionable: true,
  },
  {
    type: 'new_funding', severity: 'opportunity',
    title: 'Writer closes $200M Series C — custom model deployments scaling',
    description: 'Each new enterprise customer at Writer adds a dedicated fine-tuned model deployment. Reserved capacity locks in economics before their sales motion scales further.',
    affectedParty: 'Writer', actionable: true,
  },
  {
    type: 'price_spike', severity: 'warning',
    title: 'H200 on-demand prices up 6% over 24 hours',
    description: 'H200 pricing pressure reflects tightening supply as more labs transition to newer architecture. Buyers without locked-in reserved rates face increasing cost exposure.',
    actionable: true,
  },
  {
    type: 'arbitrage', severity: 'opportunity',
    title: 'EU vs US H100 spread hits $0.30/hr — regional arbitrage window',
    description: 'EU on-demand H100 rates (Nebius $2.69/hr) trading at a discount to US rates (CoreWeave $2.89/hr). Buyers with flexible deployment regions can capture the spread.',
    actionable: true,
  },
];
