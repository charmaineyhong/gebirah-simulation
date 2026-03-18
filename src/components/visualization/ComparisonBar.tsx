import type { VisualizationData, AgentStateCounts } from "../../simulation/snapshotEngine";

const ALGO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  fifo:            { label: "FIFO",            color: "text-sky-400",   bg: "bg-sky-400",   border: "border-sky-500/30" },
  priority:        { label: "Priority",        color: "text-amber-400", bg: "bg-amber-400", border: "border-amber-500/30" },
  weightOptimised: { label: "Weight-Optimised", color: "text-rose-400",  bg: "bg-rose-400",  border: "border-rose-500/30" },
};

interface Props {
  vizDataSet: VisualizationData[];
  currentDay: number;
}

export default function ComparisonBar({ vizDataSet, currentDay }: Props) {
  const rates = vizDataSet.map((vd) => {
    if (currentDay === 0) return { algo: vd.algorithm, rate: 0, fulfilled: 0, total: 0 };
    const states: AgentStateCounts = vd.days[currentDay - 1].agentStates;
    const total = states.requests.total;
    const fulfilled = states.requests.fulfilled;
    const rate = total > 0 ? (fulfilled / total) * 100 : 0;
    return { algo: vd.algorithm, rate, fulfilled, total };
  });

  const maxRate = Math.max(...rates.map((r) => r.rate), 1);
  const leadingAlgo = rates.reduce((best, r) => (r.rate > best.rate ? r : best), rates[0]);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[0.6rem] uppercase tracking-widest text-zinc-600 font-semibold">
          Fulfillment Race
        </p>
        {currentDay > 0 && (
          <span className={`text-[10px] font-mono font-semibold ${ALGO_CONFIG[leadingAlgo.algo]?.color ?? "text-zinc-400"}`}>
            {ALGO_CONFIG[leadingAlgo.algo]?.label ?? leadingAlgo.algo} leading
          </span>
        )}
      </div>
      <div className="space-y-2">
        {rates.map(({ algo, rate, fulfilled, total }) => {
          const cfg = ALGO_CONFIG[algo] ?? { label: algo, color: "text-zinc-400", bg: "bg-zinc-400", border: "border-zinc-500/30" };
          const barPct = maxRate > 0 ? (rate / maxRate) * 100 : 0;
          const isLeading = algo === leadingAlgo.algo && currentDay > 0;

          return (
            <div key={algo} className="flex items-center gap-3">
              <div className={`w-28 shrink-0 text-xs font-semibold ${cfg.color}`}>
                {cfg.label}
              </div>
              <div className="flex-1 h-6 bg-zinc-800/50 rounded-md overflow-hidden relative">
                <div
                  className={`absolute inset-y-0 left-0 ${cfg.bg} rounded-md transition-all duration-700 ease-out ${isLeading ? "opacity-80" : "opacity-50"}`}
                  style={{ width: `${barPct}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2.5">
                  <span className="text-[11px] font-mono font-bold text-white drop-shadow-sm">
                    {fulfilled}/{total}
                  </span>
                </div>
              </div>
              <div className="w-14 text-right">
                <span className={`text-xs font-mono font-bold ${cfg.color}`}>
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
