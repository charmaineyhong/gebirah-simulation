/**
 * Country-Level Results Table
 * Shows per-country metrics for each algorithm
 */

import { COUNTRIES } from "../../config/constants";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority-Based",
  weightOptimised: "Weight-Optimised",
};

export default function CountryTable({ results }: Props) {
  if (results.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">
          Per-Country Breakdown
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Country
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Algorithm
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Requests
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Fulfilled
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Unfulfilled
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Avg Days
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {COUNTRIES.map((country, ci) =>
              results.map((r, ri) => {
                const d = r.avgSummary.byCountry[country];
                if (!d) return null;
                return (
                  <tr
                    key={`${country}-${r.algorithm}`}
                    className={ci % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    {ri === 0 && (
                      <td
                        rowSpan={results.length}
                        className="px-4 py-2 text-sm font-medium text-gray-900 align-top"
                      >
                        {country}
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {ALGO_LABELS[r.algorithm]}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 text-right">
                      {d.totalRequests}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 text-right">
                      {d.fulfilled}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 text-right">
                      {d.unfulfilled}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 text-right">
                      {(d.fulfillmentRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 text-right">
                      {d.avgDeliveryTimeDays}
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
