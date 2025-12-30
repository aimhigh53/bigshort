export interface AuctionItem {
  id: string;
  case_number: string;
  court: string;
  property_type: string;
  address: string;
  region: string;
  city: string;
  apartment_name: string;
  dong: string;
  floor: number;
  area_m2: number;
  area_pyeong: number;
  appraisal_price: number;
  minimum_price: number;
  fail_count: number;
  auction_date: string;
  discount_rate: number;
  turnover_rate: number;
  required_investment: number;
  is_safe: boolean;
  risk_factors: RiskFactor[];
  source_url: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskFactor {
  type: 'tenant' | 'lien' | 'special' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface FilterOptions {
  minTurnoverRate: number;
  maxInvestment: number;
  failCountFilter: number[];
  safeOnly: boolean;
}

export interface CalculatorInput {
  expectedBidPrice: number;
  expectedSalePrice: number;
  loanRate?: number;
  interestRate?: number;
}

export interface CalculatorResult {
  deposit: number;
  balance: number;
  acquisitionTax: number;
  miscCost: number;
  totalInvestment: number;
  loanAmount: number;
  monthlyInterest: number;
  vat: number;
  brokerageFee: number;
  netProfit: number;
  roi: number;
}
