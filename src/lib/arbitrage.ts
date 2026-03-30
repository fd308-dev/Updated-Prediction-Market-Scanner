import type { MarketMatch, ArbitrageOpportunity, ArbitrageScenario } from "@/types";

function buildScenario(
  kalshiPrice: number,
  polymarketPrice: number,
  label: string
): ArbitrageScenario {
  const totalCost = kalshiPrice + polymarketPrice;
  const profit = 1.0 - totalCost;
  const profitPercent = (profit / totalCost) * 100;
  return {
    kalshiPrice,
    polymarketPrice,
    totalCost,
    profit,
    profitPercent,
    isArbitrage: totalCost < 1.0,
    label,
  };
}

export function calculateArbitrage(matches: MarketMatch[]): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (const match of matches) {
    const { kalshi, polymarket } = match;

    // Convert Kalshi cents (0-100) to decimal (0-1)
    const kalshiYesAsk = kalshi.yes_ask / 100;
    const kalshiNoAsk = kalshi.no_ask / 100;
    const polyYes = polymarket.yesPrice;
    const polyNo = polymarket.noPrice;

    // Scenario A: buy Kalshi YES + buy Polymarket NO
    // Pays out $1 whether YES or NO wins
    const scenarioA = buildScenario(
      kalshiYesAsk,
      polyNo,
      `Buy YES on Kalshi @ ${(kalshiYesAsk * 100).toFixed(1)}¢ + Buy NO on Polymarket @ ${(polyNo * 100).toFixed(1)}¢`
    );

    // Scenario B: buy Kalshi NO + buy Polymarket YES
    const scenarioB = buildScenario(
      kalshiNoAsk,
      polyYes,
      `Buy NO on Kalshi @ ${(kalshiNoAsk * 100).toFixed(1)}¢ + Buy YES on Polymarket @ ${(polyYes * 100).toFixed(1)}¢`
    );

    const bestScenario: "A" | "B" =
      scenarioA.profitPercent >= scenarioB.profitPercent ? "A" : "B";
    const bestProfitPercent =
      bestScenario === "A" ? scenarioA.profitPercent : scenarioB.profitPercent;
    const hasArbitrage = scenarioA.isArbitrage || scenarioB.isArbitrage;

    opportunities.push({
      id: `${kalshi.ticker}-${polymarket.conditionId}`,
      match,
      scenarioA,
      scenarioB,
      bestScenario,
      bestProfitPercent,
      hasArbitrage,
    });
  }

  // Sort: true arbitrage first (by profit% desc), then near-misses
  opportunities.sort((a, b) => b.bestProfitPercent - a.bestProfitPercent);
  return opportunities;
}
