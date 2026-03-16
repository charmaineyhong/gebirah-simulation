/**
 * Country Breakdown Chart
 * Shows fulfillment rate per country, grouped by algorithm
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
} from "recharts";
import { COUNTRIES } from "../../config/constants";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

const COLORS: Record<string, string> = {
  fifo: "#3b82f6",
  priority: "#f59e0b",
  weightOptimised: "#10b981",
};

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority-Based",
  weightOptimised: "Weight-Optimised",
};

export default function CountryBreakdown({ results }: Props) {
  const data = COUNTRIES.map((country) => {
    const point: Record<string, string | number> = { country };
    for (const r of results) {
      const countryData = r.avgSummary.byCountry[country];
      if (countryData) {
        point[r.algorithm] = Math.round(countryData.fulfillmentRate * 10000) / 100;
      }
    }
    return point;
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Fulfillment Rate by Country
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="country" />
          <YAxis domain={[0, 100]} label={{ value: "%", position: "insideLeft" }} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          <Legend />
          {results.map((r) => (
            <Bar
              key={r.algorithm}
              dataKey={r.algorithm}
              name={ALGO_LABELS[r.algorithm]}
              fill={COLORS[r.algorithm]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
