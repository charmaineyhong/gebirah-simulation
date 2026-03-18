import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { VisualizationData, AgentStateCounts } from "../simulation/snapshotEngine";
import PlaybackControls from "../components/visualization/PlaybackControls";
import FlowMap from "../components/visualization/FlowMap";
import ComparisonBar from "../components/visualization/ComparisonBar";
import EventLog from "../components/visualization/EventLog";

const ALGO_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  fifo:            { label: "FIFO",             color: "text-sky-400",   border: "border-sky-500/25" },
  priority:        { label: "Priority-Based",   color: "text-amber-400", border: "border-amber-500/25" },
  weightOptimised: { label: "Weight-Optimised",  color: "text-rose-400",  border: "border-rose-500/25" },
};

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

  // Shared playback timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying && currentDay < totalDays) {
      intervalRef.current = window.setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= totalDays) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
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
    } else {
      setIsPlaying((p) => !p);
    }
  }, [currentDay, totalDays]);

  const handleSpeedChange = useCallback((s: number) => setSpeed(s), []);
  const handleSeek = useCallback((day: number) => { setCurrentDay(day); setIsPlaying(false); }, []);

  // Per-algorithm snapshots and cumulative states for current day
  const algoData = useMemo(() => {
    return vizDataSet.map((vd) => {
      const snapshot = currentDay > 0 ? vd.days[currentDay - 1] : null;
      const agentStates: AgentStateCounts | null = currentDay > 0 ? vd.days[currentDay - 1].agentStates : null;
      return { vd, snapshot, agentStates };
    });
  }, [vizDataSet, currentDay]);

  // Shared narrative (requests + travellers are the same across algorithms due to same seed)
  const narrative = useMemo(() => {
    const snap = algoData[0]?.snapshot;
    if (!snap) return null;
    const parts: string[] = [];
    const newReqs = snap.newRequests.length;
    const travellers = snap.newTravellers.length;
    if (newReqs > 0) parts.push(`${newReqs} new request${newReqs > 1 ? "s" : ""}`);
    if (travellers > 0) parts.push(`${travellers} traveller${travellers > 1 ? "s" : ""} at Changi`);
    return parts.join(". ") + ".";
  }, [algoData]);

  // Config from first algorithm (all share same config)
  const config = vizDataSet[0]?.config;

  // Completion ranking
  const ranking = useMemo(() => {
    if (currentDay < totalDays) return null;
    return vizDataSet
      .map((vd) => {
        const states = vd.days[totalDays - 1].agentStates;
        const s = states.requests;
        const rate = s.total > 0 ? (s.fulfilled / s.total) * 100 : 0;
        return {
          algo: vd.algorithm,
          fulfilled: s.fulfilled,
          total: s.total,
          rate,
          avgDelivery: states.avgDeliveryTimeDays,
          wastedPct: Math.round(states.wastedCapacityRate * 100),
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [vizDataSet, currentDay, totalDays]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="panel p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
            <svg className="w-[18px] h-[18px] text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Algorithm Comparison
            </h2>
            <p className="text-[0.65rem] text-zinc-500">
              {config?.startMonth} &middot; {config?.willingnessScenario} scenario &middot; {((config?.platformAdoptionRate ?? 0) * 100).toFixed(1)}% reach &middot; same seed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {vizDataSet.map((vd) => {
            const cfg = ALGO_CONFIG[vd.algorithm];
            return (
              <span key={vd.algorithm} className={`${cfg?.color ?? "text-zinc-400"} font-semibold`}>
                {cfg?.label ?? vd.algorithm}
              </span>
            );
          })}
        </div>
      </div>

      {/* Playback controls */}
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

      {/* Day narrative */}
      {narrative && (
        <div className="panel px-5 py-3 border-accent/15 fade-in" key={currentDay}>
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs font-bold text-accent shrink-0 mt-0.5">
              DAY {currentDay}
            </span>
            <p className="text-sm text-zinc-300 leading-relaxed">{narrative}</p>
          </div>
        </div>
      )}

      {/* Fulfillment race bar */}
      <ComparisonBar vizDataSet={vizDataSet} currentDay={currentDay} />

      {/* 3-column algorithm pipelines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {algoData.map(({ vd, snapshot, agentStates }) => {
          const cfg = ALGO_CONFIG[vd.algorithm] ?? { label: vd.algorithm, color: "text-zinc-400", border: "border-zinc-500/25" };
          return (
            <FlowMap
              key={vd.algorithm}
              snapshot={snapshot}
              agentStates={agentStates}
              algorithmLabel={cfg.label}
              algoColor={cfg.color}
              algoBorderColor={cfg.border}
            />
          );
        })}
      </div>

      {/* Shared event log */}
      <EventLog
        snapshots={vizDataSet[0]?.days ?? []}
        currentDay={currentDay}
      />

      {/* Completion panel with ranking */}
      {ranking && (
        <div className="panel p-6 text-center">
          <div className="text-emerald-400 text-lg font-semibold mb-4">
            Simulation Complete
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              <span className="w-6" />
              <span className="flex-1 text-left">Algorithm</span>
              <span className="w-16 text-right">Delivered</span>
              <span className="w-14 text-right">Rate</span>
              <span className="w-14 text-right">Avg Time</span>
              <span className="w-14 text-right">Wasted</span>
            </div>
            {ranking.map((r, i) => {
              const cfg = ALGO_CONFIG[r.algo];
              return (
                <div
                  key={r.algo}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${i === 0 ? "bg-emerald-500/8 border border-emerald-500/20" : "bg-zinc-800/30 border border-edge"}`}
                >
                  <span className={`text-sm font-bold font-mono w-6 ${i === 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                    #{i + 1}
                  </span>
                  <span className={`text-sm font-semibold flex-1 text-left ${cfg?.color ?? "text-zinc-300"}`}>
                    {cfg?.label ?? r.algo}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 w-16 text-right">
                    {r.fulfilled}/{r.total}
                  </span>
                  <span className={`text-sm font-bold font-mono w-14 text-right ${i === 0 ? "text-emerald-400" : "text-zinc-300"}`}>
                    {r.rate.toFixed(1)}%
                  </span>
                  <span className="text-xs font-mono text-zinc-400 w-14 text-right">
                    {r.avgDelivery}d
                  </span>
                  <span className={`text-xs font-mono w-14 text-right ${r.wastedPct > 60 ? "text-red-400" : "text-zinc-400"}`}>
                    {r.wastedPct}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => { setCurrentDay(0); setIsPlaying(true); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              Replay
            </button>
            <button
              onClick={onStop}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-subtle border border-edge hover:bg-zinc-700/40 transition-colors"
            >
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
