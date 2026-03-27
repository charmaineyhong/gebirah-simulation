/**
 * Fulfillment Rate Bar Chart
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

export default function FulfillmentChart({ results }: Props) {
  const data = results.map((result) => ({
    algorithm: ALGORITHM_THEMES[result.algorithm].label,
    algoKey: result.algorithm,
    value: Math.round(result.avgSummary.fulfillmentRate * 10000) / 100,
    ciLower:
      Math.round(result.avgSummary.fulfillmentRate * 10000) / 100 -
      Math.round(result.confidenceIntervals.fulfillmentRate.lower * 10000) / 100,
    ciUpper:
      Math.round(result.confidenceIntervals.fulfillmentRate.upper * 10000) / 100 -
      Math.round(result.avgSummary.fulfillmentRate * 10000) / 100,
  }));

  return (
    <div className="panel p-5">
      <p className="section-label mb-1">
        Overall Fulfillment Rate (delivered / requested)
      </p>
      <p className="text-[0.6rem] text-zinc-500 mb-4">
        Error bars show 95% confidence interval across{" "}
        {results[0]?.numRuns ?? "N"} Monte Carlo runs
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
          barSize={48}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="algorithm" axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Fulfillment Rate"]}
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            cursor={{ fill: CHART_CURSOR_FILL }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.algoKey}
                fill={ALGORITHM_THEMES[entry.algoKey].hex}
                fillOpacity={0.85}
              />
            ))}
            <ErrorBar dataKey="ciUpper" direction="y" stroke="#8f84b7" strokeWidth={1} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
