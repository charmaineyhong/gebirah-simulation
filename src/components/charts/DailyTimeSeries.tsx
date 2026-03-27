/**
 * Daily Time Series Chart
 */

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ALGORITHM_THEMES,
  CHART_AXIS_LABEL_STYLE,
  CHART_GRID,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "../../config/theme";
import type { ExperimentResult } from "../../simulation/types";

interface Props {
  results: ExperimentResult[];
  metric: "cumulativeFulfilled" | "backlogSize" | "requestsFulfilledToday";
  title: string;
  yLabel: string;
}

export default function DailyTimeSeries({
  results,
  metric,
  title,
  yLabel,
}: Props) {
  const numDays = results[0]?.avgDailyMetrics.length || 0;
  const data: Record<string, number>[] = [];

  for (let day = 0; day < numDays; day += 1) {
    const point: Record<string, number> = { day: day + 1 };
    for (const result of results) {
      const dayMetrics = result.avgDailyMetrics[day];
      if (dayMetrics) {
        point[result.algorithm] = dayMetrics[metric];
      }
    }
    data.push(point);
  }

  return (
    <div className="panel p-5">
      <p className="section-label mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            label={{
              value: "Day",
              position: "insideBottomRight",
              offset: -4,
              ...CHART_AXIS_LABEL_STYLE,
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              ...CHART_AXIS_LABEL_STYLE,
            }}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            labelFormatter={(label) => `Day ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "Sora, sans-serif" }}
            iconType="plainline"
          />
          {results.map((result) => (
            <Line
              key={result.algorithm}
              type="monotone"
              dataKey={result.algorithm}
              name={ALGORITHM_THEMES[result.algorithm].label}
              stroke={ALGORITHM_THEMES[result.algorithm].hex}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 3.5,
                strokeWidth: 0,
                fill: ALGORITHM_THEMES[result.algorithm].hex,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
