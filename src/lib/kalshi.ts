import type { KalshiMarket } from "@/types";

const KALSHI_BASE = "https://trading-api.kalshi.com/trade-api/v2";

interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
}

async function getAuthToken(): Promise<string | null> {
  // Option B: pre-fetched token
  const preToken = process.env.KALSHI_API_TOKEN;
  if (preToken) return preToken;

  // Option A: login with email/password
  const email = process.env.KALSHI_EMAIL;
  const password = process.env.KALSHI_PASSWORD;
  if (!email || !password) {
    console.error("[kalshi] No credentials configured (need KALSHI_EMAIL+KALSHI_PASSWORD or KALSHI_API_TOKEN)");
    return null;
  }

  try {
    const res = await fetch(`${KALSHI_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      console.error(`[kalshi] Login failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data.token ?? null;
  } catch (err) {
    console.error("[kalshi] Login error:", err);
    return null;
  }
}

async function fetchEvents(headers: Record<string, string>): Promise<KalshiEvent[]> {
  const allEvents: KalshiEvent[] = [];
  let cursor = "";

  // Paginate through events (up to 5 pages)
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ limit: "200", status: "open" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${KALSHI_BASE}/events?${params}`, { headers });
    if (!res.ok) {
      console.error(`[kalshi] Events fetch failed: ${res.status} ${res.statusText}`);
      break;
    }

    const data = await res.json();
    const events: KalshiEvent[] = data.events ?? [];
    allEvents.push(...events);

    cursor = data.cursor ?? "";
    if (!cursor) break;
  }

  return allEvents;
}

export async function fetchKalshiMarkets(): Promise<KalshiMarket[]> {
  const token = await getAuthToken();
  if (!token) {
    console.error("[kalshi] Cannot fetch markets without auth token");
    return [];
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const events = await fetchEvents(headers);
  if (events.length === 0) return [];

  // Fetch markets for all events in parallel (batched)
  const marketPromises = events.map(async (event) => {
    const params = new URLSearchParams({
      event_ticker: event.event_ticker,
      status: "open",
    });

    try {
      const res = await fetch(`${KALSHI_BASE}/markets?${params}`, { headers });
      if (!res.ok) return [];

      const data = await res.json();
      const rawMarkets: any[] = data.markets ?? [];

      return rawMarkets
        .filter(
          (m) =>
            m.status === "active" &&
            parseFloat(m.yes_ask) > 0 &&
            parseFloat(m.yes_ask) < 100 &&
            parseFloat(m.no_ask) > 0 &&
            parseFloat(m.no_ask) < 100
        )
        .map((m) => ({
          ticker: m.ticker,
          title: m.title || event.title,
          subtitle: m.yes_sub_title,
          category: event.category ?? "",
          status: m.status,
          yes_bid: Math.round(parseFloat(m.yes_bid)),
          yes_ask: Math.round(parseFloat(m.yes_ask)),
          no_bid: Math.round(parseFloat(m.no_bid)),
          no_ask: Math.round(parseFloat(m.no_ask)),
          volume: parseFloat(m.volume) || 0,
          close_time: m.expiration_time,
        }));
    } catch {
      return [];
    }
  });

  const results = await Promise.all(marketPromises);
  const markets = results.flat();

  console.log(`[kalshi] Found ${markets.length} tradeable markets from ${events.length} events`);

  // Sort by volume descending, return top 100
  markets.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
  return markets.slice(0, 100);
}
