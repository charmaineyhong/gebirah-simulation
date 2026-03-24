/**
 * Simulation Progress Bar
 */

import type { ExperimentProgress } from "../simulation/runner";

interface Props {
  progress: ExperimentProgress | null;
}

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority",
  weightOptimised: "Weight-Opt",
};

const ALGO_ACCENT: Record<string, string> = {
  fifo: "#38bdf8",
  priority: "#fbbf24",
  weightOptimised: "#fb7185",
};

const ALGO_ORDER = ["fifo", "priority", "weightOptimised"];

export default function SimulationProgress({ progress }: Props) {
  if (!progress) return null;

  const currentIdx = ALGO_ORDER.indexOf(progress.currentAlgorithm);

  return (
    <div className="panel p-5" style={{ animation: "glow-pulse 3s ease-in-out infinite" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: ALGO_ACCENT[progress.currentAlgorithm] }}
          />
          <span className="text-sm font-medium text-zinc-200">
            {ALGO_LABELS[progress.currentAlgorithm]}
          </span>
          <span className="font-mono text-xs text-zinc-500">
            {progress.currentRun}/{progress.totalRuns}
          </span>
        </div>
        <span className="font-mono text-sm font-semibold text-accent">
          {progress.percentComplete}%
        </span>
      </div>

      {/* Track */}
      <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress.percentComplete}%`,
            backgroundColor: ALGO_ACCENT[progress.currentAlgorithm],
          }}
        />
      </div>

      {/* Steps */}
      <div className="mt-3 flex gap-1">
        {ALGO_ORDER.map((algo, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={algo}
              className="flex-1 text-center text-[0.65rem] font-medium py-1 rounded transition-colors"
              style={{
                backgroundColor: isCurrent
                  ? `${ALGO_ACCENT[algo]}15`
                  : isDone
                  ? "rgba(39, 39, 42, 0.5)"
                  : "transparent",
                color: isCurrent
                  ? ALGO_ACCENT[algo]
                  : isDone
                  ? "#71717a"
                  : "#3f3f46",
                borderBottom: isCurrent ? `2px solid ${ALGO_ACCENT[algo]}` : "2px solid transparent",
              }}
            >
              {isDone ? "\u2713 " : ""}{ALGO_LABELS[algo]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
