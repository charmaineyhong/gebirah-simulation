/**
 * Simulation Progress Bar
 */

import type { ExperimentProgress } from "../simulation/runner";
import { ALGORITHM_THEMES, BRAND_PALETTE } from "../config/theme";

interface Props {
  progress: ExperimentProgress | null;
}

const ALGO_ORDER: ExperimentProgress["currentAlgorithm"][] = [
  "fifo",
  "priority",
  "weightOptimised",
];

export default function SimulationProgress({ progress }: Props) {
  if (!progress) return null;

  const currentIdx = ALGO_ORDER.indexOf(progress.currentAlgorithm);

  return (
    <div className="panel p-5" style={{ animation: "glow-pulse 3s ease-in-out infinite" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: ALGORITHM_THEMES[progress.currentAlgorithm].hex }}
          />
          <span className="text-sm font-medium text-zinc-800">
            {ALGORITHM_THEMES[progress.currentAlgorithm].label}
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
            backgroundColor: ALGORITHM_THEMES[progress.currentAlgorithm].hex,
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
                  ? `${ALGORITHM_THEMES[algo].hex}15`
                  : isDone
                  ? "rgba(93, 72, 160, 0.08)"
                  : "transparent",
                color: isCurrent
                  ? ALGORITHM_THEMES[algo].hex
                  : isDone
                  ? BRAND_PALETTE.mutedInk
                  : "#b0a7cf",
                borderBottom: isCurrent ? `2px solid ${ALGORITHM_THEMES[algo].hex}` : "2px solid transparent",
              }}
            >
              {isDone ? "\u2713 " : ""}{ALGORITHM_THEMES[algo].label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
