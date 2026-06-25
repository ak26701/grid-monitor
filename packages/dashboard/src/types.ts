export type GPUModel = 'H100_SXM5' | 'H100_PCIe' | 'H200' | 'A100_80GB' | 'B200';
export type ContractType = 'reserved' | 'on-demand' | 'spot';
export type PipelineStage = 'prospect' | 'contacted' | 'in_negotiation' | 'onboarded';
export type ProviderType = 'neocloud' | 'marketplace';
export type CompanyStage = 'seed' | 'series_a' | 'series_b' | 'series_c' | 'growth';
export type ComputeUseCase = 'training' | 'inference' | 'both';
export type Region = 'us-east' | 'us-west' | 'eu-west' | 'eu-central' | 'apac';

export interface GPUInventory {
  model: GPUModel;
  totalUnits: number;
  availableUnits: number;
  priceOnDemand: number;
  priceReserved?: number;
  priceSpot?: number;
}

export interface ComputeProvider {
  id: string;
  name: string;
  type: ProviderType;
  regions: Region[];
  inventory: GPUInventory[];
  contractTypes: ContractType[];
  minCommitmentDays: number;
  hedgeReadinessScore: number;
  hedgeReadinessReason: string;
  pipelineStage: PipelineStage;
  utilizationPct: number;
  totalH100Equiv: number;
  notes: string;
  livePrices?: Record<string, number>;
}

export interface FundingRound {
  date: string;
  amountM: number;
  round: string;
  lead: string;
}

export interface AICompany {
  id: string;
  name: string;
  stage: CompanyStage;
  totalRaisedM: number;
  lastFunding: FundingRound;
  headcount: number;
  computeUseCase: ComputeUseCase;
  monthlyH100Hours: number;
  preferredContracts: ContractType[];
  preferredRegions: Region[];
  computeUrgencyScore: number;
  computeUrgencyReason: string;
  pipelineStage: PipelineStage;
  keyContact: string;
  notes: string;
}

export interface PricePoint {
  timestamp: string;
  h100OnDemand: number;
  h100Reserved: number;
  h100Spot: number;
  h200OnDemand: number;
}

export interface MarketIndex {
  current: PricePoint;
  change24hPct: number;
  change7dPct: number;
  history: PricePoint[];
  providerCount: number;
  totalH100Supply: number;
  avgUtilization: number;
}

export interface MarketMatch {
  id: string;
  providerId: string;
  providerName: string;
  companyId: string;
  companyName: string;
  matchScore: number;
  reasoning: string;
  estimatedAnnualValue: string;
  gpuModel: GPUModel;
  suggestedContract: ContractType;
  estimatedGPUs: number;
  timeToClose: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MarketAlert {
  id: string;
  type: 'price_drop' | 'price_spike' | 'new_funding' | 'capacity_expansion' | 'arbitrage' | 'low_utilization' | 'capacity_drought';
  severity: 'info' | 'warning' | 'opportunity';
  title: string;
  description: string;
  timestamp: string;
  affectedParty?: string;
  actionable: boolean;
}

export type TabId = 'supply' | 'demand' | 'market' | 'matches' | 'alerts';
