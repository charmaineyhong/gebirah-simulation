/**
 * Country-Level Results Table
 */

import { COUNTRIES } from "../../config/constants";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority",
  weightOptimised: "Weight-Opt",
};

const ALGO_COLORS: Record<string, string> = {
  fifo: "#38bdf8",
  priority: "#fbbf24",
  weightOptimised: "#fb7185",
};

export default function CountryTable({ results }: Props) {
  if (results.length === 0) return null;

  // Precompute best rate (highest) and best avg days (lowest) per country
  const bestByCountry: Record<string, { bestRate: number; bestDays: number }> = {};
  for (const country of COUNTRIES) {
    let bestRate = -1;
    let bestDays = Infinity;
    for (const r of results) {
      const d = r.avgSummary.byCountry[country];
      if (!d) continue;
      if (d.fulfillmentRate > bestRate) bestRate = d.fulfillmentRate;
      if (d.avgDeliveryTimeDays < bestDays) bestDays = d.avgDeliveryTimeDays;
    }
    bestByCountry[country] = { bestRate, bestDays };
  }

  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-edge flex items-center justify-between">
        <p className="section-label">Per-country breakdown</p>
        <span className="text-[0.6rem] text-zinc-600 font-mono">best in country highlighted</span>
      </div>
      <div className="overflow-x-auto data-table">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-left">Algorithm</th>
              <th className="px-4 py-3 text-right">Requests</th>
              <th className="px-4 py-3 text-right">Fulfilled</th>
              <th className="px-4 py-3 text-right">Unfulfilled</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Avg Days</th>
            </tr>
          </thead>
          <tbody>
            {COUNTRIES.map((country, ci) =>
              results.map((r, ri) => {
                const d = r.avgSummary.byCountry[country];
                if (!d) return null;
                const best = bestByCountry[country];
                const isBestRate = d.fulfillmentRate === best.bestRate;
                const isBestDays = d.avgDeliveryTimeDays === best.bestDays;
                return (
                  <tr
                    key={`${country}-${r.algorithm}`}
                    className={ci % 2 === 0 ? "" : "bg-raised/40"}
                    style={{ borderBottom: ri === results.length - 1 ? "1px solid rgba(63,63,70,0.25)" : undefined }}
                  >
                    {ri === 0 && (
                      <td
                        rowSpan={results.length}
                        className="px-4 py-2 font-medium text-zinc-200 align-top"
                      >
                        {country}
                      </td>
                    )}
                    <td className="px-4 py-2 text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-sm"
                          style={{ backgroundColor: ALGO_COLORS[r.algorithm] }}
                        />
                        {ALGO_LABELS[r.algorithm]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-300">
                      {d.totalRequests}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-300">
                      {d.fulfilled}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-300">
                      {d.unfulfilled}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-medium">
                      {isBestRate ? (
                        <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                          {(d.fulfillmentRate * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-zinc-400">
                          {(d.fulfillmentRate * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-medium">
                      {isBestDays ? (
                        <span className="text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                          {d.avgDeliveryTimeDays}
                        </span>
                      ) : (
                        <span className="text-zinc-400">
                          {d.avgDeliveryTimeDays}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
