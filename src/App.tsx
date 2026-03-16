import { useState, useCallback } from "react";
import type { WillingnessScenario } from "./config/constants";
import type { ScenarioOutput } from "./simulation/types";
import type { ExperimentProgress } from "./simulation/runner";
import { runExperiment } from "./simulation/runner";
import { saveSimulationRun } from "./services/simulationService";
import SimulationSetup from "./pages/SimulationSetup";
import SimulationProgress from "./pages/SimulationProgress";
import Results from "./pages/Results";

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ExperimentProgress | null>(null);
  const [output, setOutput] = useState<ScenarioOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(
    async (scenario: WillingnessScenario, numRuns: number, startMonth: string, platformAdoptionRate: number) => {
      setIsRunning(true);
      setError(null);
      setOutput(null);
      setProgress({ currentAlgorithm: "fifo", currentRun: 0, totalRuns: numRuns, percentComplete: 0 });

      try {
        // Run the simulation in a setTimeout to allow the UI to update
        // (the simulation is CPU-intensive and would block the main thread)
        const result = await new Promise<ScenarioOutput>((resolve) => {
          setTimeout(() => {
            const res = runExperiment(scenario, numRuns, startMonth, platformAdoptionRate, (p) => {
              setProgress({ ...p });
            });
            resolve(res);
          }, 100);
        });

        setOutput(result);

        // Try to save to Supabase (non-blocking)
        saveSimulationRun(result).catch((e) =>
          console.log("Could not save to Supabase:", e)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Simulation failed");
      } finally {
        setIsRunning(false);
        setProgress(null);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Project Gebirah
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent-Based Simulation for Humanitarian Donation Delivery
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Setup Panel */}
        <SimulationSetup onRun={handleRun} isRunning={isRunning} />

        {/* Progress Bar (shown while running) */}
        {isRunning && <SimulationProgress progress={progress} />}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}

        {/* Results (shown after completion) */}
        {output && <Results output={output} />}

        {/* Info Section (shown when no results yet) */}
        {!output && !isRunning && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-800 mb-1">1. Configure</div>
                <p>
                  Pick a willingness scenario (what % of travellers will help),
                  number of runs, start month and Operational Reach.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-800 mb-1">2. Simulate</div>
                <p>
                  The engine runs 30 simulated days for each of the 3 matching
                  algorithms (FIFO, Priority-Based, Weight-Optimised).
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-800 mb-1">3. Compare</div>
                <p>
                  View charts and tables comparing fulfillment rates, delivery
                  times, and per-country breakdowns across algorithms.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          DAI x Gebirah | 60.008 Systems Design Studio | SUTD
        </div>
      </footer>
    </div>
  );
}

export default App;
