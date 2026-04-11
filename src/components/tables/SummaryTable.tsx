/**
 * Summary Metrics Table
 */

import { ALGORITHM_THEMES, TABLE_DIVIDER } from "../../config/theme";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

function Tip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="relative group/tip cursor-help inline-flex items-center gap-1">
      {label}
      <svg className="w-3 h-3 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover/tip:block w-56 bg-zinc-800 text-white text-[0.62rem] leading-relaxed rounded-lg px-2.5 py-1.5 z-20 shadow-lg whitespace-normal font-normal">
        {tip}
      </span>
    </span>
  );
}

export default function SummaryTable({ results }: Props) {
  if (results.length === 0) return null;

  const fmt = (value: number) => `${(value * 100).toFixed(1)}%`;
  const ci = (range: { lower: number; upper: number }) =>
    `${(range.lower * 100).toFixed(1)} - ${(range.upper * 100).toFixed(1)}%`;

  const hasExpired = results.some((r) => r.avgSummary.totalExpired > 0);

  const rows: {
    label: string;
    tip: string;
    render: (result: ExperimentResult) => string;
    ciRender?: (result: ExperimentResult) => string;
  }[] = [
    {
      label: "Requests generated",
      tip: "Total donation requests that came in over the 30-day simulation",
      render: (result) => result.avgSummary.totalRequestsGenerated.toString(),
    },
    {
      label: "Total fulfilled",
      tip: "Number of requests that were successfully delivered to recipients",
      render: (result) => result.avgSummary.totalRequestsFulfilled.toString(),
    },
    {
      label: "Fulfillment rate",
      tip: "% of all requests that were delivered — higher is better",
      render: (result) => fmt(result.avgSummary.fulfillmentRate),
      ciRender: (result) => ci(result.confidenceIntervals.fulfillmentRate),
    },
    {
      label: "Avg delivery (days)",
      tip: "Average days from when a request was posted to when goods arrived — lower is better",
      render: (result) => result.avgSummary.avgDeliveryTimeDays.toString(),
      ciRender: (result) =>
        `${result.confidenceIntervals.avgDeliveryTimeDays.lower.toFixed(1)} - ${result.confidenceIntervals.avgDeliveryTimeDays.upper.toFixed(1)}`,
    },
    {
      label: "Urgent fulfillment",
      tip: "% of high-urgency requests that were delivered before their expiry deadline",
      render: (result) => fmt(result.avgSummary.urgentFulfillmentRate),
      ciRender: (result) => ci(result.confidenceIntervals.urgentFulfillmentRate),
    },
    {
      label: "Weight delivered (kg)",
      tip: "Total kilograms of donations successfully carried to recipients",
      render: (result) => result.avgSummary.totalWeightDeliveredKg.toFixed(1),
    },
    {
      label: "Avg backlog",
      tip: "Average number of requests waiting to be matched each day — lower means less queue build-up",
      render: (result) => result.avgSummary.avgBacklogSize.toString(),
    },
    {
      label: "Wasted capacity",
      tip: "% of travellers who flew out without carrying any donations — their spare baggage went unused",
      render: (result) => fmt(result.avgSummary.wastedCapacityRate),
      ciRender: (result) => ci(result.confidenceIntervals.wastedCapacityRate),
    },
    {
      label: "Capacity utilisation",
      tip: "Among travellers who did carry donations, how much of their spare baggage was actually used",
      render: (result) => fmt(result.avgSummary.avgCapacityUtilisation),
    },
    ...(hasExpired
      ? [
          {
            label: "Expired requests",
            tip: "High-urgency requests that weren't matched in time and expired — lower is better",
            render: (result: ExperimentResult) =>
              result.avgSummary.totalExpired.toString(),
          },
        ]
      : []),
    {
      label: "Max wait time (days)",
      tip: "The longest any single request had to wait before being delivered",
      render: (result) => result.avgSummary.maxWaitTime.toString(),
    },
    {
      label: "Waiting > 20 days",
      tip: "Number of requests still undelivered after 20+ days — a fairness indicator, lower is better",
      render: (result) =>
        result.avgSummary.requestsWaitingOver20Days.toString(),
    },
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
              <th className="px-5 py-3 text-left w-56">Metric</th>
              {results.map((result) => (
                <th key={result.algorithm} className="px-4 py-3 text-center w-36">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{
                        backgroundColor: ALGORITHM_THEMES[result.algorithm].hex,
                      }}
                    />
                    {ALGORITHM_THEMES[result.algorithm].label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.label}
                className={`${index % 2 === 0 ? "bg-white/0" : "bg-zinc-50/60"} hover:bg-accent/4 transition-colors`}
                style={{ borderBottom: TABLE_DIVIDER }}
              >
                <td className="px-5 py-3 text-zinc-700 font-medium text-sm">
                  <Tip label={row.label} tip={row.tip} />
                </td>
                {results.map((result) => (
                  <td
                    key={result.algorithm}
                    className="px-4 py-3 font-mono text-zinc-800 text-center text-sm"
                  >
                    {row.render(result)}
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
