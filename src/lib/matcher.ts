import Anthropic from "@anthropic-ai/sdk";
import type { KalshiMarket, PolymarketParsed, MarketMatch } from "@/types";

const client = new Anthropic();

interface RawMatch {
  kalshi_index: number;
  polymarket_index: number;
  confidence: number;
  reason: string;
}

export async function matchMarkets(
  kalshiMarkets: KalshiMarket[],
  polymarkets: PolymarketParsed[]
): Promise<MarketMatch[]> {
  if (kalshiMarkets.length === 0 || polymarkets.length === 0) {
    return [];
  }

  console.log(`[matcher] Matching ${kalshiMarkets.length} Kalshi vs ${polymarkets.length} Polymarket markets`);
  console.log(`[matcher] Sample Kalshi: ${kalshiMarkets.slice(0, 3).map(m => m.title).join(' | ')}`);
  console.log(`[matcher] Sample Poly: ${polymarkets.slice(0, 3).map(m => m.question).join(' | ')}`);

  // Format market lists — send only descriptive fields, not prices
  const kalshiList = kalshiMarkets
    .map(
      (m, i) =>
        `${i}. [${m.ticker}] ${m.title}${m.subtitle ? ` — ${m.subtitle}` : ""}${m.category ? ` (${m.category})` : ""}${m.close_time ? ` [closes: ${m.close_time.split("T")[0]}]` : ""}`
    )
    .join("\n");

  const polyList = polymarkets
    .map(
      (m, i) =>
        `${i}. ${m.question}${m.endDate ? ` [ends: ${m.endDate.split("T")[0]}]` : ""}`
    )
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [
      {
        name: "report_matches",
        description:
          "Report all matched prediction market pairs between Kalshi and Polymarket that refer to the same real-world event.",
        input_schema: {
          type: "object" as const,
          properties: {
            matches: {
              type: "array",
              description: "All matched pairs found",
              items: {
                type: "object",
                properties: {
                  kalshi_index: {
                    type: "integer",
                    description: "0-based index into the Kalshi markets list",
                  },
                  polymarket_index: {
                    type: "integer",
                    description: "0-based index into the Polymarket markets list",
                  },
                  confidence: {
                    type: "integer",
                    description:
                      "Confidence that these refer to the same event (0-100). Only include if >= 75.",
                  },
                  reason: {
                    type: "string",
                    description:
                      "Brief explanation of why these markets match (1-2 sentences)",
                  },
                },
                required: ["kalshi_index", "polymarket_index", "confidence", "reason"],
              },
            },
          },
          required: ["matches"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "report_matches" },
    messages: [
      {
        role: "user",
        content: `You are an expert at matching prediction market events across trading platforms.

Your task: find pairs of markets (one from Kalshi, one from Polymarket) that are asking about the EXACT SAME specific real-world event with the SAME binary outcome.

STRICT matching criteria — ALL must be true:
- The markets must refer to the EXACT SAME specific event, not just the same topic or category
- The same key entities (people, organizations, places) must appear in both markets
- The SPECIFIC OUTCOME being asked about must be identical (e.g., "win presidency" ≠ "be VP nominee" ≠ "win primary" — even if about the same person)
- Similar resolution timeframe (same month or week)
- Same direction (don't match "Will X win?" with "Will X lose?")
- Each Kalshi market can match at most ONE Polymarket market (no duplicates)

DO NOT match markets that:
- Are merely in the same broad category (e.g., "geopolitics", "crypto", "sports")
- Involve different entities, even if the topic area is similar
- Ask fundamentally different questions about the same person or entity (e.g., "Will Person X win the presidency?" vs "Will Person X be the VP nominee?" are DIFFERENT markets — do NOT match them)
- Involve the same person but different roles, positions, or outcomes

If you are unsure whether two markets refer to the same event, do NOT include them. Only report high-confidence matches. When in doubt, reject the match.

Only include matches with confidence >= 75.

KALSHI MARKETS (${kalshiMarkets.length} total, indexed 0–${kalshiMarkets.length - 1}):
${kalshiList}

POLYMARKET MARKETS (${polymarkets.length} total, indexed 0–${polymarkets.length - 1}):
${polyList}

Call report_matches with all pairs you find.`,
      },
    ],
  });

  // Extract the tool_use block
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return [];
  }

  const { matches } = toolUse.input as { matches: RawMatch[] };

  if (!Array.isArray(matches)) return [];

  // Map indices back to full market objects, validate ranges
  const results: MarketMatch[] = [];
  const usedKalshiIndices = new Set<number>();
  const usedPolyIndices = new Set<number>();

  for (const m of matches) {
    if (
      typeof m.kalshi_index !== "number" ||
      typeof m.polymarket_index !== "number" ||
      m.kalshi_index < 0 ||
      m.kalshi_index >= kalshiMarkets.length ||
      m.polymarket_index < 0 ||
      m.polymarket_index >= polymarkets.length ||
      m.confidence < 75 ||
      usedKalshiIndices.has(m.kalshi_index) ||
      usedPolyIndices.has(m.polymarket_index)
    ) {
      continue;
    }

    usedKalshiIndices.add(m.kalshi_index);
    usedPolyIndices.add(m.polymarket_index);

    results.push({
      kalshi: kalshiMarkets[m.kalshi_index],
      polymarket: polymarkets[m.polymarket_index],
      matchConfidence: m.confidence,
      matchReason: m.reason,
    });
  }

  return results;
}
