/**
 * Daily Time Series Chart
 * Shows how metrics change over the 30 simulated days
 * (cumulative fulfilled, backlog size, etc.)
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
  metric: "cumulativeFulfilled" | "backlogSize" | "requestsFulfilledToday";
  title: string;
  yLabel: string;
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

export default function DailyTimeSeries({ results, metric, title, yLabel }: Props) {
  // Merge all algorithms' daily data into one array keyed by day
  const numDays = results[0]?.avgDailyMetrics.length || 0;
  const data = [];

  for (let d = 0; d < numDays; d++) {
    const point: Record<string, number> = { day: d + 1 };
    for (const r of results) {
      const dayMetrics = r.avgDailyMetrics[d];
      if (dayMetrics) {
        point[r.algorithm] = dayMetrics[metric];
      }
    }
    data.push(point);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" label={{ value: "Day", position: "insideBottomRight", offset: -5 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          {results.map((r) => (
            <Line
              key={r.algorithm}
              type="monotone"
              dataKey={r.algorithm}
              name={ALGO_LABELS[r.algorithm]}
              stroke={COLORS[r.algorithm]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
