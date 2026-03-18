/**
 * Fulfillment Rate Bar Chart
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
  Cell,
} from "recharts";
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

export default function FulfillmentChart({ results }: Props) {
  const data = results.map((r) => ({
    algorithm: ALGO_LABELS[r.algorithm] || r.algorithm,
    algoKey: r.algorithm,
    value: Math.round(r.avgSummary.fulfillmentRate * 10000) / 100,
    ciLower:
      Math.round(r.avgSummary.fulfillmentRate * 10000) / 100 -
      Math.round(r.confidenceIntervals.fulfillmentRate.lower * 10000) / 100,
    ciUpper:
      Math.round(r.confidenceIntervals.fulfillmentRate.upper * 10000) / 100 -
      Math.round(r.avgSummary.fulfillmentRate * 10000) / 100,
  }));

  return (
    <div className="panel p-5">
      <p className="section-label mb-4">Fulfillment rate</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }} barSize={48}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" vertical={false} />
          <XAxis dataKey="algorithm" axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Rate"]}
            contentStyle={{
              backgroundColor: "#1a1a1f",
              borderRadius: 8,
              border: "1px solid rgba(63,63,70,0.5)",
              color: "#d4d4d8",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
            }}
            labelStyle={{ color: "#71717a", fontFamily: "Sora, sans-serif" }}
            cursor={{ fill: "rgba(6, 182, 212, 0.05)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.algoKey} fill={ALGO_COLORS[entry.algoKey]} fillOpacity={0.85} />
            ))}
            <ErrorBar dataKey="ciUpper" direction="y" stroke="#71717a" strokeWidth={1} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
