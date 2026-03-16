/**
 * Summary Metrics Table
 * Shows all key metrics for each algorithm in a comparison table
 */

import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority-Based",
  weightOptimised: "Weight-Optimised",
};

export default function SummaryTable({ results }: Props) {
  if (results.length === 0) return null;

  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const formatCI = (ci: { lower: number; upper: number }) =>
    `[${(ci.lower * 100).toFixed(1)}%, ${(ci.upper * 100).toFixed(1)}%]`;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">
          Algorithm Comparison Summary
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Metric
              </th>
              {results.map((r) => (
                <th
                  key={r.algorithm}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {ALGO_LABELS[r.algorithm]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Total Requests Generated
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {r.avgSummary.totalRequestsGenerated}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Total Fulfilled
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {r.avgSummary.totalRequestsFulfilled}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Fulfillment Rate
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {formatPct(r.avgSummary.fulfillmentRate)}
                  <br />
                  <span className="text-xs text-gray-400">
                    95% CI: {formatCI(r.confidenceIntervals.fulfillmentRate)}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Avg Delivery Time (days)
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {r.avgSummary.avgDeliveryTimeDays}
                  <br />
                  <span className="text-xs text-gray-400">
                    95% CI: [{r.confidenceIntervals.avgDeliveryTimeDays.lower.toFixed(1)},{" "}
                    {r.confidenceIntervals.avgDeliveryTimeDays.upper.toFixed(1)}]
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Urgent Fulfillment Rate
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {formatPct(r.avgSummary.urgentFulfillmentRate)}
                  <br />
                  <span className="text-xs text-gray-400">
                    95% CI: {formatCI(r.confidenceIntervals.urgentFulfillmentRate)}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Total Weight Delivered (kg)
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {r.avgSummary.totalWeightDeliveredKg.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Avg Backlog Size
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {r.avgSummary.avgBacklogSize}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Wasted Capacity Rate
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {formatPct(r.avgSummary.wastedCapacityRate)}
                  <br />
                  <span className="text-xs text-gray-400">
                    95% CI: {formatCI(r.confidenceIntervals.wastedCapacityRate)}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-gray-900">
                Avg Capacity Utilisation
              </td>
              {results.map((r) => (
                <td key={r.algorithm} className="px-6 py-3 text-sm text-gray-700">
                  {formatPct(r.avgSummary.avgCapacityUtilisation)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
