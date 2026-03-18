/**
 * Daily Time Series Chart
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
  fifo: "#38bdf8",
  priority: "#fbbf24",
  weightOptimised: "#fb7185",
};

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority",
  weightOptimised: "Weight-Opt",
};

export default function DailyTimeSeries({ results, metric, title, yLabel }: Props) {
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
    <div className="panel p-5">
      <p className="section-label mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            label={{ value: "Day", position: "insideBottomRight", offset: -4, fill: "#52525b", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#52525b", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1f",
              borderRadius: 8,
              border: "1px solid rgba(63,63,70,0.5)",
              color: "#d4d4d8",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
            }}
            labelStyle={{ color: "#71717a", fontFamily: "Sora, sans-serif" }}
            labelFormatter={(label) => `Day ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "Sora, sans-serif" }}
            iconType="plainline"
          />
          {results.map((r) => (
            <Line
              key={r.algorithm}
              type="monotone"
              dataKey={r.algorithm}
              name={ALGO_LABELS[r.algorithm]}
              stroke={COLORS[r.algorithm]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0, fill: COLORS[r.algorithm] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
