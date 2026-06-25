import { ComputeProvider } from '../types';

export const providers: ComputeProvider[] = [
  {
    id: 'coreweave',
    name: 'CoreWeave',
    type: 'neocloud',
    regions: ['us-east', 'us-west', 'eu-west'],
    inventory: [
      {
        model: 'H100_SXM5',
        totalUnits: 28000,
        availableUnits: 6160,
        priceOnDemand: 2.89,
        priceReserved: 2.25,
        priceSpot: 1.79,
      },
      {
        model: 'H200',
        totalUnits: 4000,
        availableUnits: 800,
        priceOnDemand: 4.49,
        priceReserved: 3.59,
      },
    ],
    contractTypes: ['on-demand', 'reserved'],
    minCommitmentDays: 30,
    hedgeReadinessScore: 88,
    hedgeReadinessReason:
      'Heaviest GPU capex of any neocloud (~$7B+ in debt financing). Every unhedged GPU is direct P&L exposure. Revenue certainty needed to service debt covenants.',
    pipelineStage: 'contacted',
    utilizationPct: 78,
    totalH100Equiv: 32000,
    notes:
      'Largest neocloud by fleet. CFO Josh Silverman is the right contact for financial products. Reportedly doing bespoke OTC hedging with PE counterparties — Ornn replaces that with a liquid market.',
  },
  {
    id: 'nebius',
    name: 'Nebius',
    type: 'neocloud',
    regions: ['eu-west', 'eu-central', 'us-east'],
    inventory: [
      {
        model: 'H100_SXM5',
        totalUnits: 6000,
        availableUnits: 1740,
        priceOnDemand: 2.69,
        priceReserved: 2.09,
      },
      {
        model: 'H200',
        totalUnits: 2000,
        availableUnits: 580,
        priceOnDemand: 4.19,
        priceReserved: 3.39,
      },
    ],
    contractTypes: ['on-demand', 'reserved'],
    minCommitmentDays: 14,
    hedgeReadinessScore: 82,
    hedgeReadinessReason:
      'Aggressive EU expansion (~$700M raised) with high capex commitments and new entrant market risk. Revenue stability essential to fund next build-out phase.',
    pipelineStage: 'prospect',
    utilizationPct: 71,
    totalH100Equiv: 8000,
    notes:
      'Ex-Yandex cloud team. EU-first strategy aligns perfectly with Aleph Alpha and Mistral demand. CFO Dmitry Sergeyev. Strong candidate for first EU-side structured product.',
  },
  {
    id: 'lambda-labs',
    name: 'Lambda Labs',
    type: 'neocloud',
    regions: ['us-west', 'us-east'],
    inventory: [
      {
        model: 'H100_SXM5',
        totalUnits: 10000,
        availableUnits: 1700,
        priceOnDemand: 2.49,
        priceReserved: 1.99,
        priceSpot: 1.50,
      },
      {
        model: 'A100_80GB',
        totalUnits: 4000,
        availableUnits: 760,
        priceOnDemand: 1.79,
        priceReserved: 1.39,
        priceSpot: 0.99,
      },
    ],
    contractTypes: ['on-demand', 'reserved', 'spot'],
    minCommitmentDays: 7,
    hedgeReadinessScore: 71,
    hedgeReadinessReason:
      'Strong developer brand but significant spot market volatility exposure. High utilization reduces urgency but spot price swings create margin unpredictability.',
    pipelineStage: 'contacted',
    utilizationPct: 83,
    totalH100Equiv: 14000,
    notes:
      'CEO Stephen Balaban directly involved in enterprise deals. Spot volatility is a known pain point — good entry angle. Growing enterprise segment creates reserved capacity hedging need.',
  },
  {
    id: 'crusoe',
    name: 'Crusoe Energy',
    type: 'neocloud',
    regions: ['us-east', 'us-west'],
    inventory: [
      {
        model: 'H100_SXM5',
        totalUnits: 3500,
        availableUnits: 1155,
        priceOnDemand: 2.79,
        priceReserved: 2.15,
      },
      {
        model: 'A100_80GB',
        totalUnits: 2000,
        availableUnits: 640,
        priceOnDemand: 1.69,
        priceReserved: 1.29,
      },
    ],
    contractTypes: ['on-demand', 'reserved'],
    minCommitmentDays: 30,
    hedgeReadinessScore: 79,
    hedgeReadinessReason:
      'Unique energy model (stranded natural gas) creates dual commodity exposure — both input energy prices and output compute prices need hedging. More complex risk profile than a standard neocloud.',
    pipelineStage: 'prospect',
    utilizationPct: 67,
    totalH100Equiv: 5500,
    notes:
      'CEO Chase Lochmiller is active on the conference circuit. Low utilization (67%) = highest receptivity to offtake discussions. ESG compute angle resonates with European AI lab procurement.',
  },
  {
    id: 'runpod',
    name: 'RunPod',
    type: 'marketplace',
    regions: ['us-east', 'us-west', 'eu-west'],
    inventory: [
      {
        model: 'H100_SXM5',
        totalUnits: 5000,
        availableUnits: 1550,
        priceOnDemand: 2.29,
        priceSpot: 1.35,
      },
      {
        model: 'A100_80GB',
        totalUnits: 3000,
        availableUnits: 900,
        priceOnDemand: 1.59,
        priceSpot: 0.89,
      },
    ],
    contractTypes: ['on-demand', 'spot'],
    minCommitmentDays: 0,
    hedgeReadinessScore: 65,
    hedgeReadinessReason:
      'Marketplace model means price volatility is the product. Better approached as a data partner feeding OCPI transaction data than as a direct financial product buyer.',
    pipelineStage: 'prospect',
    utilizationPct: 69,
    totalH100Equiv: 8000,
    notes:
      'Aggregates consumer and datacenter hardware. Extreme price elasticity on spot. High-value OCPI data contributor — transaction volume gives index depth. Secondary priority for financial products.',
  },
  {
    id: 'together-ai',
    name: 'Together AI',
    type: 'neocloud',
    regions: ['us-west', 'us-east'],
    inventory: [
      {
        model: 'H100_SXM5',
        totalUnits: 4000,
        availableUnits: 760,
        priceOnDemand: 2.70,
        priceReserved: 2.10,
      },
      {
        model: 'H200',
        totalUnits: 1000,
        availableUnits: 190,
        priceOnDemand: 4.29,
        priceReserved: 3.45,
      },
    ],
    contractTypes: ['on-demand', 'reserved'],
    minCommitmentDays: 14,
    hedgeReadinessScore: 68,
    hedgeReadinessReason:
      'Dual supply/demand position creates a natural partial hedge but GPU capex is still fully exposed. Sophisticated buyer who already understands compute as a financial asset.',
    pipelineStage: 'in_negotiation',
    utilizationPct: 81,
    totalH100Equiv: 5000,
    notes:
      'Rare both-sides participant. CEO Vipul Ved Prakash is a sophisticated compute market thinker. Already in active Ornn conversations per market intel. Likely first onboarded supply partner.',
  },
  {
    id: 'voltage-park',
    name: 'Voltage Park',
    type: 'neocloud',
    regions: ['us-west', 'us-east'],
    inventory: [
      {
        model: 'H100_SXM5',
        totalUnits: 8000,
        availableUnits: 3280,
        priceOnDemand: 2.39,
        priceReserved: 1.89,
        priceSpot: 1.45,
      },
    ],
    contractTypes: ['on-demand', 'reserved', 'spot'],
    minCommitmentDays: 7,
    hedgeReadinessScore: 85,
    hedgeReadinessReason:
      'Large capex commitment (~$500M) with only 59% utilization = maximum revenue exposure. Aggressive pricing to gain share is compressing margins while hardware depreciates.',
    pipelineStage: 'contacted',
    utilizationPct: 59,
    totalH100Equiv: 8000,
    notes:
      'Backed by Accel. Lowest utilization in the market — highest urgency for offtake certainty. Competitive pricing strategy creates structural need for hedged revenue. Best near-term close candidate.',
  },
];
