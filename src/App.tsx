import { useState, useCallback, useMemo } from "react";
import type { WillingnessScenario, UrgencyScenario } from "./config/constants";
import { SIMULATION_DAYS, MATCHING_ALGORITHMS, NUM_RUNS } from "./config/constants";
import type { ScenarioOutput } from "./simulation/types";
import type { ExperimentProgress } from "./simulation/runner";
import { runExperiment } from "./simulation/runner";
import {
  runSnapshotSimulation,
  type VisualizationData,
} from "./simulation/snapshotEngine";
import { saveSimulationRun } from "./services/simulationService";
import { getAlgorithmTheme } from "./config/theme";
import SimulationSetup from "./pages/SimulationSetup";
import SimulationProgress from "./pages/SimulationProgress";
import Results from "./pages/Results";
import LiveVisualization from "./pages/LiveVisualization";
import SummaryTable from "./components/tables/SummaryTable";
import CountryTable from "./components/tables/CountryTable";

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ExperimentProgress | null>(null);
  const [output, setOutput] = useState<ScenarioOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vizData, setVizData] = useState<VisualizationData[] | null>(null);
  const [isDone, setIsDone] = useState(false);

  const handleRun = useCallback(
    async (
      scenario: WillingnessScenario,
      startMonth: string,
      platformAdoptionRate: number,
      requestsPerDay: number,
      volunteersSingapore: number,
      urgencyScenario: UrgencyScenario,
      urgentExpiryDays: number,
    ) => {
      setIsRunning(true);
      setError(null);
      setOutput(null);
      setIsDone(false);

      // Step 1: Pre-compute visualization data (instant, ~15ms for all 3 algos)
      const vizConfig = {
        willingnessScenario: scenario,
        platformAdoptionRate,
        numRuns: 1,
        simulationDays: SIMULATION_DAYS,
        startMonth,
        requestsPerDay,
        volunteersSingapore,
        urgencyScenario,
        urgentExpiryDays,
      };
      // Deterministic seed from config — same inputs always produce same visualization
      const seedStr = `${scenario}-${startMonth}-${platformAdoptionRate}-${requestsPerDay}-${volunteersSingapore}-${urgencyScenario}-${urgentExpiryDays}`;
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seed = (seed << 5) - seed + seedStr.charCodeAt(i);
        seed |= 0;
      }
      seed = Math.abs(seed);
      const vizDataSet = MATCHING_ALGORITHMS.map((algo) =>
        runSnapshotSimulation(vizConfig, algo, seed),
      );
      setVizData(vizDataSet);

      // Step 2: Run the full statistical experiment in the background
      setProgress({
        currentAlgorithm: "fifo",
        currentRun: 0,
        totalRuns: NUM_RUNS,
        percentComplete: 0,
      });

      try {
        const result = await new Promise<ScenarioOutput>((resolve) => {
          setTimeout(() => {
            const res = runExperiment(
              scenario,
              startMonth,
              platformAdoptionRate,
              (p) => {
                setProgress({ ...p });
              },
              requestsPerDay,
              volunteersSingapore,
              urgencyScenario,
              urgentExpiryDays,
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
    setIsDone(false);
  }, []);

  const handleComplete = useCallback(() => {
    setIsDone(true);
  }, []);

  const handleReplay = useCallback(() => {
    setIsDone(false);
  }, []);

  // Ranking for SimComplete panel — uses 50-run experiment output when available
  const ranking = useMemo(() => {
    const source = output;
    if (!source) return null;
    const hasUrgentScenario = source.config.urgencyScenario !== "normal";

    return [...source.results].map((r) => {
      const overall = r.avgSummary.fulfillmentRate * 100;
      const urgent = r.avgSummary.urgentFulfillmentRate * 100;
      const score = hasUrgentScenario ? (overall + urgent) / 2 : overall;
      return {
        algo: r.algorithm,
        score,
        fulfilled: r.avgSummary.totalRequestsFulfilled,
        total: r.avgSummary.totalRequestsGenerated,
        avgDelivery: r.avgSummary.avgDeliveryTimeDays,
        wastedPct: Math.round(r.avgSummary.wastedCapacityRate * 100),
        hasUrgent: hasUrgentScenario,
        overallRate: overall,
        urgentRate: urgent,
      };
    }).sort((a, b) => b.score - a.score);
  }, [output]);

  return (
    <div className='min-h-screen font-sans text-zinc-700'>
      {/* Header */}
      <header className='border-b border-edge bg-white/70 backdrop-blur-xl'>
        <div className='max-w-6xl mx-auto px-6 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-3.5'>
            <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-accent-bright/18 via-white to-accent-dim/15 flex items-center justify-center border border-accent/15 shadow-[0_12px_24px_rgba(49,68,221,0.08)]'>
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
              <h1 className='text-[1.05rem] font-semibold tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-accent-bright via-accent to-accent-dim'>
                Project Gebirah
              </h1>
              <p className='text-[0.7rem] text-zinc-500 mt-1 tracking-[0.18em] uppercase'>
                Humanitarian Donation Delivery Simulation
              </p>
            </div>
          </div>
          <div className='hidden sm:flex items-center gap-1.5 text-[0.65rem] text-zinc-500 font-mono px-2.5 py-1 rounded-full bg-white/70 border border-edge'>
            <span className='w-1.5 h-1.5 rounded-full bg-accent/60 animate-pulse' />
            SUTD 60.008
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-6 py-8 space-y-6'>
        <SimulationSetup onRun={handleRun} isRunning={isRunning} />

        {isRunning && !vizData && <SimulationProgress progress={progress} />}

        {error && (
          <div className='panel p-4 border-red-500/25 bg-red-50/70'>
            <p className='text-red-400 text-sm'>
              <span className='font-mono text-red-500/80 mr-2'>ERR</span>
              {error}
            </p>
          </div>
        )}

        {/* Live animation — shown only while playing */}
        {vizData && !isDone && (
          <>
            <LiveVisualization
              vizDataSet={vizData}
              onStop={handleStopViz}
              onComplete={handleComplete}
              experimentOutput={output}
            />
            {isRunning && (
              <div className='panel p-4'>
                <div className='flex items-center gap-3'>
                  <svg className='w-4 h-4 animate-spin text-accent' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                  </svg>
                  <span className='text-sm text-zinc-600'>
                    Computing statistical results ({progress?.percentComplete ?? 0}%)...
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Simulation complete — shown after animation ends */}
        {isDone && ranking && (
          <div className='panel p-6 text-center'>
            <div className='text-accent text-lg font-semibold mb-1'>
              Simulation Complete
            </div>
            <p className='text-[0.65rem] text-zinc-400 font-mono mb-4'>
              Rankings from 50-run statistical average
            </p>

            {(() => {
              const hasUrgent = ranking[0]?.hasUrgent ?? false;
              return (
                <div className={`${hasUrgent ? 'max-w-2xl' : 'max-w-xl'} mx-auto space-y-2`}>
                  <div className='flex items-center gap-3 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500'>
                    <span className='w-6' />
                    <span className='flex-1 text-left'>Algorithm</span>
                    <span className='w-16 text-center'>Delivered</span>
                    {hasUrgent && <span className='w-16 text-center'>All</span>}
                    {hasUrgent && <span className='w-14 text-center'>Urgent</span>}
                    <span className='w-14 text-center'>Avg Time</span>
                    <span className='w-20 text-center'>Total Score</span>
                  </div>

                  {ranking.map((result) => {
                    const algorithmTheme = getAlgorithmTheme(result.algo);
                    const roundedScore = Math.round(result.score * 10) / 10;
                    const distinctHigher = new Set(
                      ranking.map(r => Math.round(r.score * 10) / 10).filter(s => s > roundedScore)
                    ).size;
                    const rank = distinctHigher + 1;
                    const isFirst = rank === 1;

                    return (
                      <div key={result.algo} className='space-y-0.5'>
                        <div
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                            isFirst ? 'bg-accent/7 border border-accent/16' : 'bg-white/55 border border-edge'
                          }`}
                        >
                          <span className={`text-sm font-bold font-mono w-6 ${isFirst ? 'text-accent' : 'text-zinc-500'}`}>
                            #{rank}
                          </span>
                          <span className={`text-sm font-semibold flex-1 text-left ${algorithmTheme.textClass}`}>
                            {algorithmTheme.label}
                          </span>
                          <span className='text-xs font-mono text-zinc-600 w-16 text-center'>
                            {result.fulfilled}/{result.total}
                          </span>
                          {hasUrgent && (
                            <span className='text-xs font-mono text-zinc-600 w-16 text-center'>
                              {result.overallRate.toFixed(1)}%
                            </span>
                          )}
                          {hasUrgent && (
                            <span className='text-xs font-mono text-zinc-600 w-14 text-center'>
                              {result.urgentRate.toFixed(1)}%
                            </span>
                          )}
                          <span className='text-xs font-mono text-zinc-600 w-14 text-center'>
                            {result.avgDelivery}d
                          </span>
                          <span className={`text-sm font-bold font-mono w-20 text-center ${isFirst ? 'text-accent' : 'text-zinc-700'}`}>
                            {result.score.toFixed(1)}%
                          </span>
                        </div>
                        <p className='text-[0.6rem] text-zinc-400 font-mono text-right pr-2'>
                          {hasUrgent
                            ? `Total Score: ${result.overallRate.toFixed(1)}% (all) × 50% (importance weightage) + ${result.urgentRate.toFixed(1)}% (urgent) × 50% (importance weightage) = ${result.score.toFixed(1)}%`
                            : `Total Score: ${result.score.toFixed(1)}% (all requests fulfilled)`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className='flex items-center justify-center gap-3 mt-5'>
              <button
                onClick={handleReplay}
                className='px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-accent via-accent-dim to-accent-bright hover:brightness-105 transition-all shadow-[0_12px_24px_rgba(49,68,221,0.16)]'
              >
                Replay
              </button>
              <button
                onClick={handleStopViz}
                className='px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 bg-white/70 border border-edge hover:border-edge-strong transition-colors'
              >
                Back to Setup
              </button>
            </div>
          </div>
        )}

        {/* Tables — shown after animation ends */}
        {isDone && output && (
          <div className='space-y-6'>
            <SummaryTable results={output.results} />
            <CountryTable results={output.results} />
          </div>
        )}

        {/* Charts + AI insights — full width, shown after animation ends */}
        {isDone && output && (
          <Results output={output} onDownload={() => {
            const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `gebirah_${output.scenario}_results.json`;
            a.click();
            URL.revokeObjectURL(url);
          }} />
        )}

        {!output && !isRunning && !vizData && (
          <div className='panel p-7'>
            <p className='section-label mb-5'>How it works</p>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {[
                { n: "01", title: "Configure", desc: "Set willingness scenario, operational reach, and start month.", accent: "text-algo-fifo border-algo-fifo/25" },
                { n: "02", title: "Simulate", desc: "Engine runs 30 days per algorithm: FIFO, Priority-Based, and Weight-Optimised.", accent: "text-algo-priority border-algo-priority/25" },
                { n: "03", title: "Compare", desc: "Charts and tables for fulfillment rates, delivery times, and country breakdowns.", accent: "text-algo-weight border-algo-weight/25" },
              ].map((s) => (
                <div key={s.n} className={`border-l-2 ${s.accent} pl-4 py-1`}>
                  <span className='font-mono text-xs text-zinc-500'>{s.n}</span>
                  <h4 className='text-sm font-semibold text-zinc-800 mt-1'>{s.title}</h4>
                  <p className='text-xs text-zinc-500 mt-1 leading-relaxed'>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className='border-t border-edge mt-12 bg-white/55 backdrop-blur-xl'>
        <div className='max-w-6xl mx-auto px-6 py-5 flex items-center justify-between text-[0.65rem] text-zinc-500'>
          <span>DAI x Gebirah</span>
          <span className='font-mono'>60.008 Systems Design Studio | SUTD</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
