import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ComparisonBar from "../components/visualization/ComparisonBar";
import FlowMap from "../components/visualization/FlowMap";
import PlaybackControls from "../components/visualization/PlaybackControls";
import RequestQueueViz from "../components/visualization/RequestQueueViz";
import { getAlgorithmTheme } from "../config/theme";
import type { VisualizationData, AgentStateCounts } from "../simulation/snapshotEngine";
import type { ScenarioOutput } from "../simulation/types";

interface Props {
  vizDataSet: VisualizationData[];
  onStop: () => void;
  onComplete: () => void;
  experimentOutput: ScenarioOutput | null;
}

export default function LiveVisualization({ vizDataSet, onStop, onComplete, experimentOutput }: Props) {
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
    if (currentDay >= totalDays) {
      setIsPlaying(false);
      onComplete();
    }
  }, [currentDay, totalDays, onComplete]);

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
        onSkip={onComplete}
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

      <ComparisonBar vizDataSet={vizDataSet} currentDay={currentDay} experimentOutput={experimentOutput} />

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

      {/* <RequestQueueViz vizDataSet={vizDataSet} currentDay={currentDay} /> */}
    </div>
  );
}
