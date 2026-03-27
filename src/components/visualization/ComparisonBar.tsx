import type { AgentStateCounts, VisualizationData } from "../../simulation/snapshotEngine";
import { getAlgorithmTheme } from "../../config/theme";

interface Props {
  vizDataSet: VisualizationData[];
  currentDay: number;
}

export default function ComparisonBar({ vizDataSet, currentDay }: Props) {
  const rates = vizDataSet.map((visualization) => {
    if (currentDay === 0) {
      return { algo: visualization.algorithm, rate: 0, fulfilled: 0, total: 0 };
    }

    const states: AgentStateCounts = visualization.days[currentDay - 1].agentStates;
    const total = states.requests.total;
    const fulfilled = states.requests.fulfilled;
    const rate = total > 0 ? (fulfilled / total) * 100 : 0;

    return { algo: visualization.algorithm, rate, fulfilled, total };
  });

  const maxRate = Math.max(...rates.map((rate) => rate.rate), 1);
  const leadingAlgo = rates.reduce((best, rate) =>
    rate.rate > best.rate ? rate : best,
  rates[0]);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[0.6rem] uppercase tracking-widest text-zinc-500 font-semibold">
          Fulfillment Race
        </p>
        {currentDay > 0 && (
          <span
            className={`text-[10px] font-mono font-semibold ${getAlgorithmTheme(leadingAlgo.algo).textClass}`}
          >
            {getAlgorithmTheme(leadingAlgo.algo).label} leading
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <div className="w-28 shrink-0">Algorithm</div>
        <div className="flex-1">Delivered / Requested</div>
        <div className="w-14 text-right">Rate</div>
      </div>

      <div className="space-y-2">
        {rates.map(({ algo, rate, fulfilled, total }) => {
          const algorithmTheme = getAlgorithmTheme(algo);
          const barWidth = maxRate > 0 ? (rate / maxRate) * 100 : 0;
          const isLeading = algo === leadingAlgo.algo && currentDay > 0;

          return (
            <div key={algo} className="flex items-center gap-3">
              <div className={`w-28 shrink-0 text-xs font-semibold ${algorithmTheme.textClass}`}>
                {algorithmTheme.label}
              </div>

              <div className="flex-1 h-6 bg-zinc-200/85 rounded-md overflow-hidden relative">
                <div
                  className={`absolute inset-y-0 left-0 ${algorithmTheme.bgClass} rounded-md transition-all duration-700 ease-out ${isLeading ? "opacity-80" : "opacity-55"}`}
                  style={{ width: `${barWidth}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2.5">
                  <span className="text-[11px] font-mono font-bold text-white drop-shadow-sm">
                    {fulfilled}/{total}
                  </span>
                </div>
              </div>

              <div className="w-14 text-right">
                <span className={`text-xs font-mono font-bold ${algorithmTheme.textClass}`}>
                  {rate.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
