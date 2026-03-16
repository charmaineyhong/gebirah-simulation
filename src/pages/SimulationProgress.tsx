/**
 * Simulation Progress Bar
 * Shows which algorithm and run is currently being processed
 */

import type { ExperimentProgress } from "../simulation/runner";

interface Props {
  progress: ExperimentProgress | null;
}

const ALGO_LABELS: Record<string, string> = {
  fifo: "FIFO",
  priority: "Priority-Based",
  weightOptimised: "Weight-Optimised",
};

export default function SimulationProgress({ progress }: Props) {
  if (!progress) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Running Simulation...
      </h3>
      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>
            {ALGO_LABELS[progress.currentAlgorithm]} - Run {progress.currentRun}/{progress.totalRuns}
          </span>
          <span>{progress.percentComplete}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Each algorithm runs {progress.totalRuns} times with different random seeds,
        then results are averaged together for statistical reliability.
      </p>
    </div>
  );
}
