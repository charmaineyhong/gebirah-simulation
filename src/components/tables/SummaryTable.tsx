/**
 * Summary Metrics Table
 */

import { ALGORITHM_THEMES, TABLE_DIVIDER } from "../../config/theme";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

export default function SummaryTable({ results }: Props) {
  if (results.length === 0) return null;

  const fmt = (value: number) => `${(value * 100).toFixed(1)}%`;
  const ci = (range: { lower: number; upper: number }) =>
    `${(range.lower * 100).toFixed(1)} - ${(range.upper * 100).toFixed(1)}%`;

  const rows: {
    label: string;
    render: (result: ExperimentResult) => string;
    ciRender?: (result: ExperimentResult) => string;
  }[] = [
    {
      label: "Requests generated",
      render: (result) => result.avgSummary.totalRequestsGenerated.toString(),
    },
    {
      label: "Total fulfilled",
      render: (result) => result.avgSummary.totalRequestsFulfilled.toString(),
    },
    {
      label: "Fulfillment rate",
      render: (result) => fmt(result.avgSummary.fulfillmentRate),
      ciRender: (result) => ci(result.confidenceIntervals.fulfillmentRate),
    },
    {
      label: "Avg delivery (days)",
      render: (result) => result.avgSummary.avgDeliveryTimeDays.toString(),
      ciRender: (result) =>
        `${result.confidenceIntervals.avgDeliveryTimeDays.lower.toFixed(1)} - ${result.confidenceIntervals.avgDeliveryTimeDays.upper.toFixed(1)}`,
    },
    {
      label: "Urgent fulfillment",
      render: (result) => fmt(result.avgSummary.urgentFulfillmentRate),
      ciRender: (result) => ci(result.confidenceIntervals.urgentFulfillmentRate),
    },
    {
      label: "Weight delivered (kg)",
      render: (result) => result.avgSummary.totalWeightDeliveredKg.toFixed(1),
    },
    {
      label: "Avg backlog",
      render: (result) => result.avgSummary.avgBacklogSize.toString(),
    },
    {
      label: "Wasted capacity",
      render: (result) => fmt(result.avgSummary.wastedCapacityRate),
      ciRender: (result) => ci(result.confidenceIntervals.wastedCapacityRate),
    },
    {
      label: "Capacity utilisation",
      render: (result) => fmt(result.avgSummary.avgCapacityUtilisation),
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
              <th className="px-5 py-3 text-left">Metric</th>
              {results.map((result) => (
                <th key={result.algorithm} className="px-5 py-3 text-left">
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
                className={index % 2 === 0 ? "" : "bg-raised/40"}
                style={{ borderBottom: TABLE_DIVIDER }}
              >
                <td className="px-5 py-2.5 text-zinc-700 font-medium">{row.label}</td>
                {results.map((result) => (
                  <td
                    key={result.algorithm}
                    className="px-5 py-2.5 font-mono text-zinc-800"
                  >
                    {row.render(result)}
                    {row.ciRender && (
                      <span className="block text-[0.65rem] text-zinc-500 mt-0.5 font-normal">
                        95% CI: {row.ciRender(result)}
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
