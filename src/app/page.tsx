"use client";

import { useState } from "react";
import type { ArbitrageOpportunity, ScanResult } from "@/types";

function fmt(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}¢`;
}

function fmtPct(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function ProfitBadge({ pct }: { pct: number }) {
  const isArb = pct > 0;
  const isNear = pct > -5;
  return (
    <span
      className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
        isArb
          ? "bg-green-500/20 text-green-400"
          : isNear
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-gray-700 text-gray-400"
      }`}
    >
      {fmtPct(pct)}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-mono ${
        confidence >= 85
          ? "bg-blue-500/20 text-blue-400"
          : confidence >= 70
            ? "bg-gray-600 text-gray-300"
            : "bg-gray-700 text-gray-500"
      }`}
    >
      {confidence}%
    </span>
  );
}

function OpportunityRow({ opp }: { opp: ArbitrageOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  const { match, scenarioA, scenarioB, bestScenario, hasArbitrage } = opp;

  const bestScen = bestScenario === "A" ? scenarioA : scenarioB;

  return (
    <>
      <tr
        className={`border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors ${
          hasArbitrage
            ? "border-l-4 border-l-green-500 bg-green-950/20"
            : "border-l-4 border-l-transparent"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Event name */}
        <td className="px-4 py-3 max-w-xs">
          <div className="text-sm font-medium text-gray-100 truncate" title={match.kalshi.title}>
            {match.kalshi.title}
          </div>
          <div className="text-xs text-gray-500 truncate mt-0.5" title={match.polymarket.question}>
            {match.polymarket.question}
          </div>
        </td>

        {/* Kalshi prices */}
        <td className="px-4 py-3 text-center">
          <div className="text-xs text-gray-400 space-y-0.5">
            <div>
              <span className="text-green-400">YES</span>{" "}
              <span className="font-mono">{fmt(match.kalshi.yes_ask / 100)}</span>
            </div>
            <div>
              <span className="text-red-400">NO</span>{" "}
              <span className="font-mono">{fmt(match.kalshi.no_ask / 100)}</span>
            </div>
          </div>
        </td>

        {/* Polymarket prices */}
        <td className="px-4 py-3 text-center">
          <div className="text-xs text-gray-400 space-y-0.5">
            <div>
              <span className="text-green-400">YES</span>{" "}
              <span className="font-mono">{fmt(match.polymarket.yesPrice)}</span>
            </div>
            <div>
              <span className="text-red-400">NO</span>{" "}
              <span className="font-mono">{fmt(match.polymarket.noPrice)}</span>
            </div>
          </div>
        </td>

        {/* Scenario A */}
        <td className="px-4 py-3 text-center">
          <div
            className={`font-mono text-sm ${
              scenarioA.isArbitrage ? "text-green-400" : "text-gray-500"
            }`}
          >
            {fmt(scenarioA.totalCost)}
          </div>
          <ProfitBadge pct={scenarioA.profitPercent} />
        </td>

        {/* Scenario B */}
        <td className="px-4 py-3 text-center">
          <div
            className={`font-mono text-sm ${
              scenarioB.isArbitrage ? "text-green-400" : "text-gray-500"
            }`}
          >
            {fmt(scenarioB.totalCost)}
          </div>
          <ProfitBadge pct={scenarioB.profitPercent} />
        </td>

        {/* Best profit */}
        <td className="px-4 py-3 text-center">
          <ProfitBadge pct={opp.bestProfitPercent} />
          {hasArbitrage && (
            <div className="text-xs text-green-500 mt-1 font-semibold">ARB</div>
          )}
        </td>

        {/* AI confidence */}
        <td className="px-4 py-3 text-center">
          <ConfidenceBadge confidence={match.matchConfidence} />
        </td>

        {/* Expand icon */}
        <td className="px-3 py-3 text-gray-600 text-sm text-center">
          {expanded ? "▲" : "▼"}
        </td>
      </tr>

      {/* Expanded details */}
      {expanded && (
        <tr className="bg-gray-900 border-b border-gray-800">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400 font-semibold mb-1">Kalshi</div>
                <div className="text-gray-300">
                  <span className="font-mono text-xs text-gray-500">{match.kalshi.ticker}</span>
                  <br />
                  {match.kalshi.title}
                  {match.kalshi.close_time && (
                    <div className="text-xs text-gray-500 mt-1">
                      Closes: {new Date(match.kalshi.close_time).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-gray-400 font-semibold mb-1">Polymarket</div>
                <div className="text-gray-300">
                  {match.polymarket.question}
                  {match.polymarket.endDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Ends: {new Date(match.polymarket.endDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-400 font-semibold mb-1">Best Strategy</div>
                <div className="font-mono text-xs bg-gray-800 rounded px-3 py-2 text-gray-300">
                  {bestScen.label}
                  <span className="ml-3">
                    → Total cost: {fmt(bestScen.totalCost)} → Profit:{" "}
                    <span
                      className={
                        bestScen.isArbitrage ? "text-green-400 font-bold" : "text-red-400"
                      }
                    >
                      {fmtPct(bestScen.profitPercent)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-400 font-semibold mb-1">AI Match Reason</div>
                <div className="text-gray-400 text-xs italic">{match.matchReason}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        highlight
          ? "border-green-700 bg-green-950/30"
          : "border-gray-800 bg-gray-900"
      }`}
    >
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div
        className={`text-2xl font-bold font-mono mt-1 ${
          highlight ? "text-green-400" : "text-gray-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minProfit, setMinProfit] = useState<number>(-100);
  const [showOnlyArb, setShowOnlyArb] = useState(false);

  async function runScan() {
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Scan failed");
      }
      setResult(data as ScanResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsScanning(false);
    }
  }

  const filtered = result?.opportunities.filter((opp) => {
    if (showOnlyArb && !opp.hasArbitrage) return false;
    if (opp.bestProfitPercent < minProfit) return false;
    return true;
  });

  const arbCount = result?.opportunities.filter((o) => o.hasArbitrage).length ?? 0;

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Prediction Market Arbitrage Scanner
        </h1>
        <p className="text-gray-400 mt-2">
          AI-powered event matching between{" "}
          <span className="text-blue-400">Kalshi</span> and{" "}
          <span className="text-purple-400">Polymarket</span> to find pricing
          inefficiencies
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={runScan}
          disabled={isScanning}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          {isScanning ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Scanning…
            </>
          ) : (
            "Scan Now"
          )}
        </button>

        {result && (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <span>Min profit:</span>
              <input
                type="number"
                value={minProfit}
                onChange={(e) => setMinProfit(Number(e.target.value))}
                className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-100 font-mono text-sm"
                step="0.5"
              />
              <span>%</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyArb}
                onChange={(e) => setShowOnlyArb(e.target.checked)}
                className="rounded"
              />
              Arbitrage only
            </label>
          </>
        )}
      </div>

      {/* Loading message */}
      {isScanning && (
        <div className="rounded-lg border border-blue-800 bg-blue-950/30 px-4 py-3 text-blue-300 text-sm mb-6">
          <div className="font-semibold">Scanning in progress…</div>
          <div className="text-blue-400 mt-1 text-xs">
            Fetching Kalshi + Polymarket markets → AI event matching → Calculating
            arbitrage. This takes ~20–40 seconds.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-red-300 text-sm mb-6">
          <span className="font-semibold">Error: </span>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard
              label="Kalshi Markets"
              value={result.kalshiMarketsScanned}
            />
            <StatCard
              label="Polymarket"
              value={result.polymarketMarketsScanned}
            />
            <StatCard label="AI Matches" value={result.matchesFound} />
            <StatCard
              label="Arb Opportunities"
              value={arbCount}
              highlight={arbCount > 0}
            />
            <StatCard
              label="Scan Time"
              value={`${(result.durationMs / 1000).toFixed(1)}s`}
            />
          </div>

          <div className="text-xs text-gray-600 mb-4">
            Scanned at {new Date(result.timestamp).toLocaleTimeString()} —
            showing {filtered?.length} of {result.opportunities.length} matched pairs
          </div>

          {/* Table */}
          {filtered && filtered.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-center">Kalshi (ask)</th>
                    <th className="px-4 py-3 text-center">Polymarket</th>
                    <th className="px-4 py-3 text-center">
                      Scenario A
                      <div className="font-normal normal-case text-gray-600 text-xs">
                        YES Kalshi + NO Poly
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center">
                      Scenario B
                      <div className="font-normal normal-case text-gray-600 text-xs">
                        NO Kalshi + YES Poly
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center">Best Profit</th>
                    <th className="px-4 py-3 text-center">AI Conf.</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((opp) => (
                    <OpportunityRow key={opp.id} opp={opp} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-800 bg-gray-900 px-6 py-12 text-center text-gray-500">
              {result.matchesFound === 0
                ? "No matching markets found. Try scanning again or check that both platforms have active markets in common categories."
                : "No matches pass your current filters. Try lowering the min profit threshold."}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-sm" />
              True arbitrage (profit &gt; 0%)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-yellow-500/50 rounded-sm" />
              Near-miss (&minus;5% to 0%)
            </span>
            <span>Click any row to expand strategy details.</span>
            <span>
              Prices shown as cents per $1 payout. Profit assumes $1 bet on each side.
            </span>
          </div>
        </>
      )}

      {/* Setup hint shown before first scan */}
      {!result && !isScanning && !error && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 px-6 py-8 text-sm text-gray-500 space-y-2">
          <div className="text-gray-300 font-semibold text-base mb-3">
            Getting started
          </div>
          <p>
            1. Copy <code className="bg-gray-800 px-1 rounded">.env.example</code> to{" "}
            <code className="bg-gray-800 px-1 rounded">.env.local</code> and fill in
            your credentials.
          </p>
          <p>
            2. Required:{" "}
            <code className="bg-gray-800 px-1 rounded">ANTHROPIC_API_KEY</code> +
            either{" "}
            <code className="bg-gray-800 px-1 rounded">KALSHI_API_TOKEN</code> or{" "}
            <code className="bg-gray-800 px-1 rounded">KALSHI_EMAIL</code> +{" "}
            <code className="bg-gray-800 px-1 rounded">KALSHI_PASSWORD</code>.
          </p>
          <p>3. Polymarket uses its public API — no credentials needed.</p>
          <p>
            4. Click <strong className="text-white">Scan Now</strong>. The scan
            fetches up to 50 active markets from each platform, uses Claude to match
            events, then calculates arbitrage opportunities.
          </p>
        </div>
      )}
    </main>
  );
}
