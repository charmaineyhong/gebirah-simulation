import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ComparisonBar from "../components/visualization/ComparisonBar";
import EventLog from "../components/visualization/EventLog";
import FlowMap from "../components/visualization/FlowMap";
import PlaybackControls from "../components/visualization/PlaybackControls";
import { getAlgorithmTheme } from "../config/theme";
import type { VisualizationData, AgentStateCounts } from "../simulation/snapshotEngine";

interface Props {
  vizDataSet: VisualizationData[];
  onStop: () => void;
}

export default function LiveVisualization({ vizDataSet, onStop }: Props) {
  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<number | null>(null);

  const totalDays = vizDataSet[0]?.totalDays ?? 30;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying && currentDay < totalDays) {
      intervalRef.current = window.setInterval(() => {
        setCurrentDay((previous) => {
          if (previous >= totalDays) {
            setIsPlaying(false);
            return previous;
          }

          return previous + 1;
        });
      }, 1500 / speed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, totalDays, currentDay]);

  useEffect(() => {
    if (currentDay >= totalDays) setIsPlaying(false);
  }, [currentDay, totalDays]);

  const handleTogglePlay = useCallback(() => {
    if (currentDay >= totalDays) {
      setCurrentDay(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((playing) => !playing);
  }, [currentDay, totalDays]);

  const handleSpeedChange = useCallback((nextSpeed: number) => {
    setSpeed(nextSpeed);
  }, []);

  const handleSeek = useCallback((day: number) => {
    setCurrentDay(day);
    setIsPlaying(false);
  }, []);

  const algoData = useMemo(() => {
    return vizDataSet.map((visualization) => {
      const snapshot = currentDay > 0 ? visualization.days[currentDay - 1] : null;
      const agentStates: AgentStateCounts | null =
        currentDay > 0 ? visualization.days[currentDay - 1].agentStates : null;

      return { visualization, snapshot, agentStates };
    });
  }, [vizDataSet, currentDay]);

  const narrative = useMemo(() => {
    const snapshot = algoData[0]?.snapshot;
    if (!snapshot) return null;

    const parts: string[] = [];
    const newRequests = snapshot.newRequests.length;
    const travellers = snapshot.newTravellers.length;

    if (newRequests > 0) {
      parts.push(`${newRequests} new request${newRequests > 1 ? "s" : ""}`);
    }

    if (travellers > 0) {
      parts.push(`${travellers} traveller${travellers > 1 ? "s" : ""} at Changi`);
    }

    return parts.join(". ") + ".";
  }, [algoData]);

  const config = vizDataSet[0]?.config;

  const ranking = useMemo(() => {
    if (currentDay < totalDays) return null;

    return vizDataSet
      .map((visualization) => {
        const states = visualization.days[totalDays - 1].agentStates;
        const requests = states.requests;
        const rate = requests.total > 0 ? (requests.fulfilled / requests.total) * 100 : 0;

        return {
          algo: visualization.algorithm,
          fulfilled: requests.fulfilled,
          total: requests.total,
          rate,
          avgDelivery: states.avgDeliveryTimeDays,
          wastedPct: Math.round(states.wastedCapacityRate * 100),
        };
      })
      .sort((left, right) => right.rate - left.rate);
  }, [vizDataSet, currentDay, totalDays]);

  return (
    <div className="space-y-4">
      <div className="panel p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-bright/18 to-accent-dim/16 flex items-center justify-center border border-accent/20">
            <svg
              className="w-[18px] h-[18px] text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">
              Algorithm Comparison
            </h2>
            <p className="text-[0.65rem] text-zinc-500">
              {config?.startMonth} | {config?.willingnessScenario} scenario |{" "}
              {((config?.platformAdoptionRate ?? 0) * 100).toFixed(1)}% reach |
              same seed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          {vizDataSet.map((visualization) => {
            const algorithmTheme = getAlgorithmTheme(visualization.algorithm);

            return (
              <span
                key={visualization.algorithm}
                className={`${algorithmTheme.textClass} font-semibold px-2 py-1 rounded-full bg-white/60 border border-edge`}
              >
                {algorithmTheme.label}
              </span>
            );
          })}
        </div>
      </div>

      <PlaybackControls
        currentDay={currentDay}
        totalDays={totalDays}
        isPlaying={isPlaying}
        speed={speed}
        onTogglePlay={handleTogglePlay}
        onSpeedChange={handleSpeedChange}
        onSeek={handleSeek}
        onStop={onStop}
      />

      {narrative && (
        <div className="panel px-5 py-3 border-accent/15 fade-in" key={currentDay}>
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs font-bold text-accent shrink-0 mt-0.5">
              DAY {currentDay}
            </span>
            <p className="text-sm text-zinc-700 leading-relaxed">{narrative}</p>
          </div>
        </div>
      )}

      <ComparisonBar vizDataSet={vizDataSet} currentDay={currentDay} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {algoData.map(({ visualization, snapshot, agentStates }) => {
          const algorithmTheme = getAlgorithmTheme(visualization.algorithm);

          return (
            <FlowMap
              key={visualization.algorithm}
              snapshot={snapshot}
              agentStates={agentStates}
              algorithmLabel={algorithmTheme.label}
              algoHex={algorithmTheme.hex}
              algoTextClass={algorithmTheme.textClass}
              algoBorderClass={algorithmTheme.borderClass}
              isFinished={currentDay >= totalDays}
              speed={speed}
            />
          );
        })}
      </div>

      <EventLog snapshots={vizDataSet[0]?.days ?? []} currentDay={currentDay} />

      {ranking && (
        <div className="panel p-6 text-center">
          <div className="text-accent text-lg font-semibold mb-4">
            Simulation Complete
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <div className="flex items-center gap-3 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <span className="w-6" />
              <span className="flex-1 text-left">Algorithm</span>
              <span className="w-16 text-right">Delivered</span>
              <span className="w-14 text-right">Rate</span>
              <span className="w-14 text-right">Avg Time</span>
              <span className="w-14 text-right">Wasted</span>
            </div>

            {ranking.map((result, index) => {
              const algorithmTheme = getAlgorithmTheme(result.algo);

              return (
                <div
                  key={result.algo}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                    index === 0
                      ? "bg-accent/7 border border-accent/16"
                      : "bg-white/55 border border-edge"
                  }`}
                >
                  <span
                    className={`text-sm font-bold font-mono w-6 ${
                      index === 0 ? "text-accent" : "text-zinc-500"
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold flex-1 text-left ${algorithmTheme.textClass}`}
                  >
                    {algorithmTheme.label}
                  </span>
                  <span className="text-xs font-mono text-zinc-600 w-16 text-right">
                    {result.fulfilled}/{result.total}
                  </span>
                  <span
                    className={`text-sm font-bold font-mono w-14 text-right ${
                      index === 0 ? "text-accent" : "text-zinc-700"
                    }`}
                  >
                    {result.rate.toFixed(1)}%
                  </span>
                  <span className="text-xs font-mono text-zinc-600 w-14 text-right">
                    {result.avgDelivery}d
                  </span>
                  <span
                    className={`text-xs font-mono w-14 text-right ${
                      result.wastedPct > 60 ? "text-red-400" : "text-zinc-600"
                    }`}
                  >
                    {result.wastedPct}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => {
                setCurrentDay(0);
                setIsPlaying(true);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-accent via-accent-dim to-accent-bright hover:brightness-105 transition-all shadow-[0_12px_24px_rgba(49,68,221,0.16)]"
            >
              Replay
            </button>
            <button
              onClick={onStop}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 bg-white/70 border border-edge hover:border-edge-strong transition-colors"
            >
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
