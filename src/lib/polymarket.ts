import type { PolymarketMarket, PolymarketParsed } from "@/types";

const GAMMA_BASE = "https://gamma-api.polymarket.com";

export async function fetchPolymarketMarkets(): Promise<PolymarketParsed[]> {
  // Fetch multiple pages to get past sports/weather noise
  const fetches = [0, 100, 200, 300, 400].map(async (offset) => {
    const params = new URLSearchParams({
      active: "true",
      closed: "false",
      limit: "100",
      order: "volume",
      ascending: "false",
      offset: String(offset),
    });

    try {
      const res = await fetch(`${GAMMA_BASE}/markets?${params}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });

      if (!res.ok) return [];
      return (await res.json()) as PolymarketMarket[];
    } catch {
      return [];
    }
  });

  const pages = await Promise.all(fetches);
  const raw = pages.flat();

  const parsed: PolymarketParsed[] = [];

  for (const market of raw) {
    if (market.closed || !market.active) continue;

    let prices: number[];
    let outcomes: string[];

    try {
      prices = JSON.parse(market.outcomePrices).map((p: string) => parseFloat(p));
      outcomes = JSON.parse(market.outcomes);
    } catch {
      continue;
    }

    // Only process binary (2-outcome) markets
    if (prices.length !== 2 || outcomes.length !== 2) continue;

    const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
    const noIdx = outcomes.findIndex((o) => o.toLowerCase() === "no");

    const yesPrice = yesIdx >= 0 ? prices[yesIdx] : prices[0];
    const noPrice = noIdx >= 0 ? prices[noIdx] : prices[1];

    if (yesPrice <= 0 || yesPrice >= 1 || noPrice <= 0 || noPrice >= 1) continue;

    parsed.push({
      ...market,
      yesPrice,
      noPrice,
      volume: parseFloat(market.volume as unknown as string) || 0,
    });
  }

  // Sort by volume descending, return top 100
  parsed.sort((a, b) => b.volume - a.volume);
  return parsed.slice(0, 100);
}
