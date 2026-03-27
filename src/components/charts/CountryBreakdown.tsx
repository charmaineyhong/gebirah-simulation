/**
 * Country Breakdown Chart
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COUNTRIES } from "../../config/constants";
import {
  ALGORITHM_THEMES,
  CHART_CURSOR_FILL,
  CHART_GRID,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "../../config/theme";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
}

export default function CountryBreakdown({ results }: Props) {
  const data = COUNTRIES.map((country) => {
    const point: Record<string, string | number> = { country };
    for (const result of results) {
      const countryData = result.avgSummary.byCountry[country];
      if (countryData) {
        point[result.algorithm] =
          Math.round(countryData.fulfillmentRate * 10000) / 100;
      }
    }
    return point;
  });

  return (
    <div className="panel p-5">
      <p className="section-label mb-4">
        Fulfillment Rate by Country (delivered / requested)
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="country" axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toFixed(1)}%`,
              `${name} Fulfillment`,
            ]}
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            cursor={{ fill: CHART_CURSOR_FILL }}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Sora, sans-serif" }} />
          {results.map((result) => (
            <Bar
              key={result.algorithm}
              dataKey={result.algorithm}
              name={ALGORITHM_THEMES[result.algorithm].label}
              fill={ALGORITHM_THEMES[result.algorithm].hex}
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
