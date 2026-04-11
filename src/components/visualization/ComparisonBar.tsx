import type { AgentStateCounts, VisualizationData } from "../../simulation/snapshotEngine";
import type { ScenarioOutput } from "../../simulation/types";
import { getAlgorithmTheme } from "../../config/theme";

interface Props {
  vizDataSet: VisualizationData[];
  currentDay: number;
  experimentOutput: ScenarioOutput | null;
}

function combinedScore(overall: number, urgent: number, hasUrgent: boolean): number {
  if (!hasUrgent) return overall;
  return 0.5 * overall + 0.5 * urgent;
}

export default function ComparisonBar({ vizDataSet, currentDay, experimentOutput }: Props) {
  const totalDays = vizDataSet[0]?.totalDays ?? 30;
  const isComplete = currentDay >= totalDays;

  // When complete and 50-run results are ready, use those instead of snapshot
  const rates = (isComplete && experimentOutput)
    ? experimentOutput.results.map((result) => {
        const s = result.avgSummary;
        const overallRate = s.fulfillmentRate * 100;
        const hasUrgent = s.urgentFulfillmentRate > 0 || s.totalExpired > 0;
        const urgentRate = s.urgentFulfillmentRate * 100;
        const score = combinedScore(overallRate, urgentRate, hasUrgent);
        return {
          algo: result.algorithm,
          score,
          overallRate,
          urgentRate,
          fulfilled: s.totalRequestsFulfilled,
          total: s.totalRequestsGenerated,
          hasUrgent,
        };
      })
    : vizDataSet.map((visualization) => {
        if (currentDay === 0) {
          return { algo: visualization.algorithm, score: 0, overallRate: 0, urgentRate: 0, fulfilled: 0, total: 0, hasUrgent: false };
        }

        const states: AgentStateCounts = visualization.days[currentDay - 1].agentStates;
        const total = states.requests.total;
        const fulfilled = states.requests.fulfilled;
        const overallRate = total > 0 ? (fulfilled / total) * 100 : 0;

        const hasUrgent = states.totalUrgentGenerated > 0;
        const urgentRate = hasUrgent
          ? (states.urgentFulfilled / states.totalUrgentGenerated) * 100
          : 0;

        const score = combinedScore(overallRate, urgentRate, hasUrgent);
        return { algo: visualization.algorithm, score, overallRate, urgentRate, fulfilled, total, hasUrgent };
      });

  const anyUrgent = rates.some((r) => r.hasUrgent);
  const maxScore = Math.max(...rates.map((r) => r.score), 1);
  const leadingAlgo = rates.reduce((best, r) => r.score > best.score ? r : best, rates[0]);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[0.6rem] uppercase tracking-widest text-zinc-500 font-semibold">
            Fulfillment Race
            {isComplete && experimentOutput && (
              <span className="ml-1.5 normal-case font-normal text-accent/70">· 50-run avg</span>
            )}
          </p>
          {anyUrgent && (
            <p className="text-[0.58rem] text-zinc-400 mt-0.5">
              Score = 50% All Requests + 50% Urgent
            </p>
          )}
        </div>
        {currentDay > 0 && (
          <span className={`text-[10px] font-mono font-semibold ${getAlgorithmTheme(leadingAlgo.algo).textClass}`}>
            {getAlgorithmTheme(leadingAlgo.algo).label} leading
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <div className="w-28 shrink-0">Algorithm</div>
        <div className="flex-1">Delivered / Requested</div>
        <div className="w-16 text-right">Score</div>
      </div>

      <div className="space-y-2.5">
        {rates.map(({ algo, score, overallRate, urgentRate, fulfilled, total, hasUrgent }) => {
          const algorithmTheme = getAlgorithmTheme(algo);
          const barWidth = maxScore > 0 ? (score / maxScore) * 100 : 0;
          const isLeading = algo === leadingAlgo.algo && currentDay > 0;

          return (
            <div key={algo}>
              <div className="flex items-center gap-3">
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

                <div className="w-16 text-right">
                  <span className={`text-xs font-mono font-bold ${algorithmTheme.textClass}`}>
                    {score.toFixed(1)}%
                  </span>
                </div>
              </div>

              {hasUrgent && currentDay > 0 && (
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="w-28 shrink-0" />
                  <div className="flex-1 flex gap-3 text-[0.58rem] text-zinc-400 font-mono px-0.5">
                    <span>All {overallRate.toFixed(1)}%</span>
                    <span>Urgent {urgentRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-16" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
