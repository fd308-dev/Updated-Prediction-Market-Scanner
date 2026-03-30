import { NextResponse } from "next/server";
import { fetchKalshiMarkets } from "@/lib/kalshi";
import { fetchPolymarketMarkets } from "@/lib/polymarket";
import { matchMarkets } from "@/lib/matcher";
import { calculateArbitrage } from "@/lib/arbitrage";
import type { ScanResult } from "@/types";

// Allow up to 5 minutes — the AI matching step can take ~20-30s
export const maxDuration = 300;

export async function POST() {
  const startTime = Date.now();

  try {
    // Step 1: Fetch markets from both platforms in parallel
    const [kalshiMarkets, polymarkets] = await Promise.all([
      fetchKalshiMarkets(),
      fetchPolymarketMarkets(),
    ]);

    if (kalshiMarkets.length === 0) {
      return NextResponse.json(
        { error: "No open Kalshi markets found." },
        { status: 400 }
      );
    }

    if (polymarkets.length === 0) {
      return NextResponse.json(
        { error: "No Polymarket markets found. The Gamma API may be down." },
        { status: 400 }
      );
    }

    // Step 3: Use AI to match markets across platforms
    const matches = await matchMarkets(kalshiMarkets, polymarkets);

    // Step 4: Calculate arbitrage opportunities for each matched pair
    const opportunities = calculateArbitrage(matches);

    const result: ScanResult = {
      timestamp: new Date().toISOString(),
      kalshiMarketsScanned: kalshiMarkets.length,
      polymarketMarketsScanned: polymarkets.length,
      matchesFound: matches.length,
      opportunities,
      durationMs: Date.now() - startTime,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("[scan] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
