/**
 * Fulfillment Rate Bar Chart
 * Shows fulfillment rate (%) for each algorithm side by side
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
} from "recharts";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority-Based",
  weightOptimised: "Weight-Optimised",
};

export default function FulfillmentChart({ results }: Props) {
  const data = results.map((r) => ({
    algorithm: ALGO_LABELS[r.algorithm] || r.algorithm,
    "Fulfillment Rate": Math.round(r.avgSummary.fulfillmentRate * 10000) / 100,
    ciLower:
      Math.round(r.avgSummary.fulfillmentRate * 10000) / 100 -
      Math.round(r.confidenceIntervals.fulfillmentRate.lower * 10000) / 100,
    ciUpper:
      Math.round(r.confidenceIntervals.fulfillmentRate.upper * 10000) / 100 -
      Math.round(r.avgSummary.fulfillmentRate * 10000) / 100,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Fulfillment Rate by Algorithm
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="algorithm" />
          <YAxis domain={[0, 100]} label={{ value: "%", position: "insideLeft" }} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="Fulfillment Rate" fill="#3b82f6" radius={[4, 4, 0, 0]}>
            <ErrorBar dataKey="ciUpper" direction="y" stroke="#1e40af" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
