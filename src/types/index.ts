export interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  category: string;
  status: string;
  yes_bid: number; // integer 0-100 (cents)
  yes_ask: number; // integer 0-100 (cents)
  no_bid: number;  // integer 0-100 (cents)
  no_ask: number;  // integer 0-100 (cents)
  volume: number;
  close_time?: string;
}

export interface PolymarketMarket {
  id: string;
  conditionId: string;
  question: string;
  outcomePrices: string; // raw JSON string e.g. '["0.72","0.28"]'
  outcomes: string;      // raw JSON string e.g. '["Yes","No"]'
  volume: string;        // string number from API
  active: boolean;
  closed: boolean;
  endDate?: string;
}

export interface PolymarketParsed extends Omit<PolymarketMarket, "volume"> {
  yesPrice: number; // decimal 0-1
  noPrice: number;  // decimal 0-1
  volume: number;
}

export interface MarketMatch {
  kalshi: KalshiMarket;
  polymarket: PolymarketParsed;
  matchConfidence: number; // 0-100
  matchReason: string;
}

export interface ArbitrageScenario {
  kalshiPrice: number;     // decimal: kalshiYesAsk/100 or kalshiNoAsk/100
  polymarketPrice: number; // decimal: polyYes or polyNo
  totalCost: number;       // kalshiPrice + polymarketPrice
  profit: number;          // 1 - totalCost (positive = arbitrage exists)
  profitPercent: number;   // profit / totalCost * 100
  isArbitrage: boolean;    // totalCost < 1.0
  label: string;           // human-readable description
}

export interface ArbitrageOpportunity {
  id: string;
  match: MarketMatch;
  // Scenario A: buy Kalshi YES + buy Polymarket NO
  scenarioA: ArbitrageScenario;
  // Scenario B: buy Kalshi NO + buy Polymarket YES
  scenarioB: ArbitrageScenario;
  // Best scenario
  bestScenario: "A" | "B";
  bestProfitPercent: number;
  hasArbitrage: boolean; // either scenario has profit > 0
}

export interface ScanResult {
  timestamp: string;
  kalshiMarketsScanned: number;
  polymarketMarketsScanned: number;
  matchesFound: number;
  opportunities: ArbitrageOpportunity[];
  durationMs: number;
}
