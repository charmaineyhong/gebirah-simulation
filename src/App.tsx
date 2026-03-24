import { useState, useCallback } from "react";
import type { WillingnessScenario } from "./config/constants";
import { SIMULATION_DAYS, MATCHING_ALGORITHMS } from "./config/constants";
import type { ScenarioOutput } from "./simulation/types";
import type { ExperimentProgress } from "./simulation/runner";
import { runExperiment } from "./simulation/runner";
import {
  runSnapshotSimulation,
  type VisualizationData,
} from "./simulation/snapshotEngine";
import { saveSimulationRun } from "./services/simulationService";
import SimulationSetup from "./pages/SimulationSetup";
import SimulationProgress from "./pages/SimulationProgress";
import Results from "./pages/Results";
import LiveVisualization from "./pages/LiveVisualization";

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ExperimentProgress | null>(null);
  const [output, setOutput] = useState<ScenarioOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vizData, setVizData] = useState<VisualizationData[] | null>(null);

  const handleRun = useCallback(
    async (
      scenario: WillingnessScenario,
      numRuns: number,
      startMonth: string,
      platformAdoptionRate: number,
      requestsPerDay: number,
      volunteersSingapore: number,
    ) => {
      setIsRunning(true);
      setError(null);
      setOutput(null);

      // Step 1: Pre-compute visualization data (instant, ~15ms for all 3 algos)
      const vizConfig = {
        willingnessScenario: scenario,
        platformAdoptionRate,
        numRuns: 1,
        simulationDays: SIMULATION_DAYS,
        startMonth,
        requestsPerDay,
        volunteersSingapore,
      };
      const seed = Date.now();
      const vizDataSet = MATCHING_ALGORITHMS.map((algo) =>
        runSnapshotSimulation(vizConfig, algo, seed),
      );
      setVizData(vizDataSet);

      // Step 2: Run the full statistical experiment in the background
      setProgress({
        currentAlgorithm: "fifo",
        currentRun: 0,
        totalRuns: numRuns,
        percentComplete: 0,
      });

      try {
        const result = await new Promise<ScenarioOutput>((resolve) => {
          setTimeout(() => {
            const res = runExperiment(
              scenario,
              numRuns,
              startMonth,
              platformAdoptionRate,
              (p) => {
                setProgress({ ...p });
              },
              requestsPerDay,
              volunteersSingapore,
            );
            resolve(res);
          }, 100);
        });

        setOutput(result);

        saveSimulationRun(result).catch((e) =>
          console.log("Could not save to Supabase:", e),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Simulation failed");
      } finally {
        setIsRunning(false);
        setProgress(null);
      }
    },
    [],
  );

  const handleStopViz = useCallback(() => {
    setVizData(null);
    setOutput(null);
  }, []);

  return (
    <div className='min-h-screen font-sans'>
      {/* Header */}
      <header className='border-b border-edge'>
        <div className='max-w-6xl mx-auto px-6 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-3.5'>
            <div className='w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20'>
              <svg
                className='w-[18px] h-[18px] text-accent'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5'
                />
              </svg>
            </div>
            <div>
              <h1 className='text-[1.05rem] font-semibold text-zinc-100 tracking-tight leading-none'>
                Project Gebirah
              </h1>
              <p className='text-[0.7rem] text-zinc-500 mt-1 tracking-wide uppercase'>
                Humanitarian Donation Delivery Simulation
              </p>
            </div>
          </div>
          <div className='hidden sm:flex items-center gap-1.5 text-[0.65rem] text-zinc-600 font-mono'>
            <span className='w-1.5 h-1.5 rounded-full bg-accent/60 animate-pulse' />
            SUTD 60.008
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-6xl mx-auto px-6 py-8 space-y-6'>
        <SimulationSetup
          onRun={handleRun}
          isRunning={isRunning}
        />

        {isRunning && !vizData && <SimulationProgress progress={progress} />}

        {error && (
          <div className='panel p-4 border-red-500/30'>
            <p className='text-red-400 text-sm'>
              <span className='font-mono text-red-500/80 mr-2'>ERR</span>
              {error}
            </p>
          </div>
        )}

        {vizData && (
          <LiveVisualization vizDataSet={vizData} onStop={handleStopViz} />
        )}

        {isRunning && vizData && (
          <div className='panel p-4'>
            <div className='flex items-center gap-3'>
              <svg className='w-4 h-4 animate-spin text-accent' fill='none' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
              </svg>
              <span className='text-sm text-zinc-400'>
                Computing statistical results ({progress?.percentComplete ?? 0}%)...
              </span>
            </div>
          </div>
        )}

        {output && <Results output={output} />}

        {!output && !isRunning && !vizData && (
          <div className='panel p-7'>
            <p className='section-label mb-5'>How it works</p>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {[
                {
                  n: "01",
                  title: "Configure",
                  desc: "Set willingness scenario, operational reach, run count, and start month.",
                  accent: "text-accent border-accent/20",
                },
                {
                  n: "02",
                  title: "Simulate",
                  desc: "Engine runs 30 days per algorithm: FIFO, Priority-Based, and Weight-Optimised.",
                  accent: "text-amber-400 border-amber-400/20",
                },
                {
                  n: "03",
                  title: "Compare",
                  desc: "Charts and tables for fulfillment rates, delivery times, and country breakdowns.",
                  accent: "text-rose-400 border-rose-400/20",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className={`border-l-2 ${s.accent} pl-4 py-1`}
                >
                  <span className='font-mono text-xs text-zinc-600'>
                    {s.n}
                  </span>
                  <h4 className='text-sm font-semibold text-zinc-200 mt-1'>
                    {s.title}
                  </h4>
                  <p className='text-xs text-zinc-500 mt-1 leading-relaxed'>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className='border-t border-edge mt-12'>
        <div className='max-w-6xl mx-auto px-6 py-5 flex items-center justify-between text-[0.65rem] text-zinc-600'>
          <span>DAI x Gebirah</span>
          <span className='font-mono'>60.008 Systems Design Studio | SUTD</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
