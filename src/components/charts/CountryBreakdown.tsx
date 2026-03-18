/**
 * Country Breakdown Chart
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
  fifo: "#38bdf8",
  priority: "#fbbf24",
  weightOptimised: "#fb7185",
};

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority",
  weightOptimised: "Weight-Opt",
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
    <div className="panel p-5">
      <p className="section-label mb-4">Fulfillment Rate by Country (delivered / requested)</p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" vertical={false} />
          <XAxis dataKey="country" axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, `${name} Fulfillment`]}
            contentStyle={{
              backgroundColor: "#1a1a1f",
              borderRadius: 8,
              border: "1px solid rgba(63,63,70,0.5)",
              color: "#f4f4f5",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
            }}
            labelStyle={{ color: "#e4e4e7", fontFamily: "Sora, sans-serif", fontWeight: 600 }}
            itemStyle={{ color: "#f4f4f5" }}
            cursor={{ fill: "rgba(6, 182, 212, 0.05)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "Sora, sans-serif" }}
          />
          {results.map((r) => (
            <Bar
              key={r.algorithm}
              dataKey={r.algorithm}
              name={ALGO_LABELS[r.algorithm]}
              fill={COLORS[r.algorithm]}
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
