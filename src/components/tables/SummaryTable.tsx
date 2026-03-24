/**
 * Summary Metrics Table
 */

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

export default function SummaryTable({ results }: Props) {
  if (results.length === 0) return null;

  const fmt = (n: number) => `${(n * 100).toFixed(1)}%`;
  const ci = (r: { lower: number; upper: number }) =>
    `${(r.lower * 100).toFixed(1)} – ${(r.upper * 100).toFixed(1)}%`;

  const rows: {
    label: string;
    render: (r: ExperimentResult) => string;
    ciRender?: (r: ExperimentResult) => string;
  }[] = [
    { label: "Requests generated", render: (r) => r.avgSummary.totalRequestsGenerated.toString() },
    { label: "Total fulfilled", render: (r) => r.avgSummary.totalRequestsFulfilled.toString() },
    {
      label: "Fulfillment rate",
      render: (r) => fmt(r.avgSummary.fulfillmentRate),
      ciRender: (r) => ci(r.confidenceIntervals.fulfillmentRate),
    },
    {
      label: "Avg delivery (days)",
      render: (r) => r.avgSummary.avgDeliveryTimeDays.toString(),
      ciRender: (r) =>
        `${r.confidenceIntervals.avgDeliveryTimeDays.lower.toFixed(1)} – ${r.confidenceIntervals.avgDeliveryTimeDays.upper.toFixed(1)}`,
    },
    {
      label: "Urgent fulfillment",
      render: (r) => fmt(r.avgSummary.urgentFulfillmentRate),
      ciRender: (r) => ci(r.confidenceIntervals.urgentFulfillmentRate),
    },
    { label: "Weight delivered (kg)", render: (r) => r.avgSummary.totalWeightDeliveredKg.toFixed(1) },
    { label: "Avg backlog", render: (r) => r.avgSummary.avgBacklogSize.toString() },
    {
      label: "Wasted capacity",
      render: (r) => fmt(r.avgSummary.wastedCapacityRate),
      ciRender: (r) => ci(r.confidenceIntervals.wastedCapacityRate),
    },
    { label: "Capacity utilisation", render: (r) => fmt(r.avgSummary.avgCapacityUtilisation) },
  ];

  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-edge">
        <p className="section-label">Algorithm comparison</p>
      </div>
      <div className="overflow-x-auto data-table">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-5 py-3 text-left">Metric</th>
              {results.map((r) => (
                <th key={r.algorithm} className="px-5 py-3 text-left">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: ALGO_COLORS[r.algorithm] }}
                    />
                    {ALGO_LABELS[r.algorithm]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? "" : "bg-raised/40"}
                style={{ borderBottom: "1px solid rgba(63,63,70,0.2)" }}
              >
                <td className="px-5 py-2.5 text-zinc-300 font-medium">{row.label}</td>
                {results.map((r) => (
                  <td key={r.algorithm} className="px-5 py-2.5 font-mono text-zinc-200">
                    {row.render(r)}
                    {row.ciRender && (
                      <span className="block text-[0.65rem] text-zinc-600 mt-0.5 font-normal">
                        95% CI: {row.ciRender(r)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
