/**
 * Live Simulation Page
 *
 * Runs all 3 matching algorithms side-by-side with animated agents,
 * real-time statistics, and day-by-day narration.
 *
 * Features (matching + exceeding ABM lecture demos):
 * - SVG agent visualization with state-based colors
 * - Geographic layout with Singapore origin + 5 destination zones
 * - Play / Pause / Step / Reset controls with speed slider
 * - Real-time counters and cumulative stats
 * - Day-by-day narration log
 * - All 3 algorithms running simultaneously for comparison
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { StepSimulation, type SimulationState } from "../simulation/stepEngine";
import {
  COUNTRIES,
  SIMULATION_DAYS,
  WILLINGNESS_SCENARIOS,
  DEFAULT_OPERATIONAL_REACH_RATE,
  type MatchingAlgorithm,
  type WillingnessScenario,
  type Country,
} from "../config/constants";
// Agent types used via SimulationState

// ============================================================
// CONSTANTS
// ============================================================

const ALGORITHMS: MatchingAlgorithm[] = ["fifo", "priority", "weightOptimised"];
const ALGO_LABELS: Record<MatchingAlgorithm, string> = {
  fifo: "FIFO (First In, First Out)",
  priority: "Priority-Based",
  weightOptimised: "Weight-Optimised (Knapsack)",
};
const ALGO_COLORS: Record<MatchingAlgorithm, string> = {
  fifo: "#3B82F6",
  priority: "#EF4444",
  weightOptimised: "#10B981",
};

// Destination layout positions (x, y) in the SVG — geographic-ish layout
const DEST_POSITIONS: Record<Country, { x: number; y: number }> = {
  Myanmar: { x: 60, y: 40 },
  Cambodia: { x: 140, y: 55 },
  Vietnam: { x: 170, y: 35 },
  Philippines: { x: 240, y: 50 },
  Indonesia: { x: 150, y: 120 },
};

const SINGAPORE_POS = { x: 150, y: 170 };

// Agent state colors
const REQUEST_COLORS: Record<string, string> = {
  Waiting: "#F59E0B",    // amber
  Matched: "#8B5CF6",    // purple
  InTransit: "#3B82F6",  // blue
  Fulfilled: "#10B981",  // green
  Expired: "#6B7280",    // gray
};

const URGENCY_SHAPES: Record<string, string> = {
  High: "▲",
  Medium: "●",
  Low: "■",
};

const TRAVELLER_COLORS: Record<string, string> = {
  Available: "#06B6D4",  // cyan
  Matched: "#8B5CF6",    // purple
  Departed: "#6B7280",   // gray
};

const VOLUNTEER_COLORS: Record<string, string> = {
  Idle: "#14B8A6",         // teal
  Assigned: "#F59E0B",     // amber
  Delivering: "#10B981",   // green
  Unavailable: "#EF4444",  // red
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function LiveSimulation() {
  // Simulation instances (one per algorithm)
  const simsRef = useRef<Map<MatchingAlgorithm, StepSimulation>>(new Map());
  const [states, setStates] = useState<Map<MatchingAlgorithm, SimulationState>>(
    new Map()
  );
  const [logs, setLogs] = useState<Map<MatchingAlgorithm, string[]>>(
    new Map()
  );

  // Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1 = 1 second per day
  const [isInitialized, setIsInitialized] = useState(false);
  const [scenario, setScenario] = useState<WillingnessScenario>("likely");
  const [seed, setSeed] = useState(42);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize simulations
  const initialize = useCallback(() => {
    const config = {
      willingnessScenario: scenario,
      platformAdoptionRate: DEFAULT_OPERATIONAL_REACH_RATE,
      numRuns: 1,
      simulationDays: SIMULATION_DAYS,
      startMonth: "Jun",
    };

    const newSims = new Map<MatchingAlgorithm, StepSimulation>();
    const newStates = new Map<MatchingAlgorithm, SimulationState>();
    const newLogs = new Map<MatchingAlgorithm, string[]>();

    for (const algo of ALGORITHMS) {
      const sim = new StepSimulation(config, algo, seed);
      newSims.set(algo, sim);
      newStates.set(algo, sim.getState());
      newLogs.set(algo, []);
    }

    simsRef.current = newSims;
    setStates(newStates);
    setLogs(newLogs);
    setIsInitialized(true);
    setIsPlaying(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [scenario, seed]);

  // Step all simulations forward one day
  const stepAll = useCallback(() => {
    const newStates = new Map<MatchingAlgorithm, SimulationState>();
    const newLogs = new Map<MatchingAlgorithm, string[]>();
    let anyRunning = false;

    for (const algo of ALGORITHMS) {
      const sim = simsRef.current.get(algo);
      if (!sim) continue;

      const state = sim.stepDay();
      newStates.set(algo, state);

      const prevLogs = logs.get(algo) ?? [];
      newLogs.set(algo, [...prevLogs, ...state.dayLog]);

      if (!state.finished) anyRunning = true;
    }

    setStates(newStates);
    setLogs(newLogs);

    if (!anyRunning) {
      setIsPlaying(false);
    }

    return anyRunning;
  }, [logs]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const interval = Math.max(100, 1000 / speed);
    timerRef.current = setTimeout(() => {
      const anyRunning = stepAll();
      if (!anyRunning) {
        setIsPlaying(false);
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, speed, stepAll]);

  // Reset
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setIsInitialized(false);
    setStates(new Map());
    setLogs(new Map());
    simsRef.current = new Map();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const currentDay = states.get("fifo")?.day ?? 0;
  const isFinished = states.get("fifo")?.finished ?? false;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold text-gray-900">
          Live Simulation — All 3 Algorithms Side-by-Side
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Watch how FIFO, Priority-Based, and Weight-Optimised algorithms make
          different matching decisions on the same stream of donation requests
          and travellers, day by day over {SIMULATION_DAYS} days.
        </p>
      </div>

      {/* Config + Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Scenario */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Willingness:
            </label>
            <select
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value as WillingnessScenario);
                handleReset();
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1"
              disabled={isPlaying}
            >
              {Object.entries(WILLINGNESS_SCENARIOS).map(([key, val]) => (
                <option key={key} value={key}>
                  {key} ({(val * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>

          {/* Seed */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Seed:</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => {
                setSeed(Number(e.target.value));
                handleReset();
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1 w-20"
              disabled={isPlaying}
            />
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Speed:</label>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-500">{speed}x</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {!isInitialized ? (
              <button
                onClick={initialize}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Initialize
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={isFinished}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    stepAll();
                  }}
                  disabled={isFinished}
                  className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Step
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Day progress bar */}
        {isInitialized && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Day {currentDay} / {SIMULATION_DAYS}</span>
              <span>
                {isFinished
                  ? "Complete"
                  : isPlaying
                    ? "Running..."
                    : "Paused"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(currentDay / SIMULATION_DAYS) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {isInitialized && (
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex flex-wrap gap-6 text-xs">
            <div>
              <span className="font-semibold text-gray-700 mr-2">
                Donation Requests:
              </span>
              {Object.entries(REQUEST_COLORS).map(([state, color]) => (
                <span key={state} className="inline-flex items-center mr-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: color }}
                  />
                  {state}
                </span>
              ))}
            </div>
            <div>
              <span className="font-semibold text-gray-700 mr-2">
                Urgency:
              </span>
              {Object.entries(URGENCY_SHAPES).map(([level, shape]) => (
                <span key={level} className="mr-3">
                  {shape} {level}
                </span>
              ))}
            </div>
            <div>
              <span className="font-semibold text-gray-700 mr-2">
                Travellers:
              </span>
              {Object.entries(TRAVELLER_COLORS).map(([state, color]) => (
                <span key={state} className="inline-flex items-center mr-3">
                  <span
                    className="inline-block w-0 h-0 mr-1"
                    style={{
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderBottom: `8px solid ${color}`,
                    }}
                  />
                  {state}
                </span>
              ))}
            </div>
            <div>
              <span className="font-semibold text-gray-700 mr-2">
                Volunteers:
              </span>
              {Object.entries(VOLUNTEER_COLORS).map(([state, color]) => (
                <span key={state} className="inline-flex items-center mr-3">
                  <span
                    className="inline-block w-3 h-3 mr-1"
                    style={{ backgroundColor: color }}
                  />
                  {state}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3 Algorithm Panels */}
      {isInitialized && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ALGORITHMS.map((algo) => (
            <AlgorithmPanel
              key={algo}
              algorithm={algo}
              state={states.get(algo)}
              logEntries={logs.get(algo) ?? []}
            />
          ))}
        </div>
      )}

      {/* Comparison Summary (shown when complete) */}
      {isFinished && <ComparisonSummary states={states} />}
    </div>
  );
}

// ============================================================
// ALGORITHM PANEL — one column showing animation + stats + log
// ============================================================

function AlgorithmPanel({
  algorithm,
  state,
  logEntries,
}: {
  algorithm: MatchingAlgorithm;
  state?: SimulationState;
  logEntries: string[];
}) {
  if (!state) return null;

  const totalRequests = state.requests.length;
  const fulfilled = state.requests.filter((r) => r.state === "Fulfilled").length;
  const fulfillmentRate =
    totalRequests > 0 ? ((fulfilled / totalRequests) * 100).toFixed(1) : "0.0";
  const totalWeight = state.requests
    .filter((r) => r.state === "Fulfilled")
    .reduce((sum, r) => sum + r.weightKg, 0);

  return (
    <div
      className="bg-white rounded-lg shadow overflow-hidden"
      style={{ borderTop: `3px solid ${ALGO_COLORS[algorithm]}` }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <h3
          className="text-sm font-bold"
          style={{ color: ALGO_COLORS[algorithm] }}
        >
          {ALGO_LABELS[algorithm]}
        </h3>
      </div>

      {/* Agent Visualization (SVG Map) */}
      <div className="p-2">
        <AgentMap state={state} algorithm={algorithm} />
      </div>

      {/* Real-time Stats */}
      <div className="px-3 pb-2">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <StatBox
            label="Waiting"
            value={state.todayStats.waiting}
            color="#F59E0B"
          />
          <StatBox
            label="In Transit"
            value={state.todayStats.inTransit}
            color="#3B82F6"
          />
          <StatBox
            label="Fulfilled"
            value={fulfilled}
            color="#10B981"
          />
          <StatBox
            label="Rate"
            value={`${fulfillmentRate}%`}
            color={ALGO_COLORS[algorithm]}
          />
          <StatBox
            label="Weight (kg)"
            value={Math.round(totalWeight * 10) / 10}
            color="#6366F1"
          />
          <StatBox
            label="No-Shows"
            value={state.dailyMetrics.reduce(
              (s, d) => s + d.volunteerNoShows,
              0
            )}
            color="#EF4444"
          />
        </div>
      </div>

      {/* Today's Activity */}
      {state.day > 0 && (
        <div className="px-3 pb-2">
          <div className="bg-gray-50 rounded p-2 text-xs space-y-0.5">
            <div className="font-semibold text-gray-700">
              Day {state.day} Activity:
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">New requests:</span>
              <span className="font-medium">{state.todayStats.newRequests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">New travellers:</span>
              <span className="font-medium">
                {state.todayStats.newTravellers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Matched:</span>
              <span className="font-medium text-purple-600">
                {state.todayStats.matched}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivered:</span>
              <span className="font-medium text-green-600">
                {state.todayStats.fulfilled}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Day Log */}
      <div className="px-3 pb-3">
        <DayLog entries={logEntries} />
      </div>
    </div>
  );
}

// ============================================================
// AGENT MAP — SVG visualization of agents at destinations
// ============================================================

function AgentMap({
  state,
  algorithm,
}: {
  state: SimulationState;
  algorithm: MatchingAlgorithm;
}) {
  const svgWidth = 300;
  const svgHeight = 210;

  // Group active requests by destination and state
  const activeRequests = state.requests.filter(
    (r) => r.state !== "Fulfilled" && r.state !== "Expired"
  );

  // Group travellers by destination (only active ones)
  const activeTravellers = state.travellers.filter(
    (t) => t.state !== "Departed"
  );

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full"
      style={{ maxHeight: 180 }}
    >
      {/* Background */}
      <rect width={svgWidth} height={svgHeight} fill="#F8FAFC" rx={4} />

      {/* Connection lines from Singapore to destinations */}
      {COUNTRIES.map((country) => {
        const dest = DEST_POSITIONS[country];
        return (
          <line
            key={`line-${country}`}
            x1={SINGAPORE_POS.x}
            y1={SINGAPORE_POS.y}
            x2={dest.x}
            y2={dest.y}
            stroke="#E2E8F0"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        );
      })}

      {/* Destination zones */}
      {COUNTRIES.map((country) => {
        const pos = DEST_POSITIONS[country];
        const countryRequests = activeRequests.filter(
          (r) => r.destination === country
        );
        const countryTravellers = activeTravellers.filter(
          (t) => t.destination === country
        );

        return (
          <g key={country}>
            {/* Zone circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={22}
              fill="white"
              stroke="#CBD5E1"
              strokeWidth={1}
            />
            {/* Country label */}
            <text
              x={pos.x}
              y={pos.y - 13}
              textAnchor="middle"
              fontSize={7}
              fontWeight="bold"
              fill="#475569"
            >
              {country.slice(0, 3).toUpperCase()}
            </text>

            {/* Request dots inside the zone */}
            {countryRequests.slice(0, 8).map((req, i) => {
              const angle = (i / Math.max(countryRequests.length, 1)) * Math.PI * 2;
              const radius = 10;
              const rx = pos.x + Math.cos(angle) * radius;
              const ry = pos.y + Math.sin(angle) * radius + 2;
              return (
                <circle
                  key={req.id}
                  cx={rx}
                  cy={ry}
                  r={3}
                  fill={REQUEST_COLORS[req.state]}
                  stroke="white"
                  strokeWidth={0.5}
                  opacity={0.9}
                >
                  <title>
                    {req.id}: {req.urgency} urgency, {req.weightKg}kg,{" "}
                    {req.state}
                  </title>
                </circle>
              );
            })}

            {/* Traveller triangles near the zone */}
            {countryTravellers.slice(0, 4).map((trav, i) => {
              const tx = pos.x + 24 + i * 8;
              const ty = pos.y;
              return (
                <polygon
                  key={trav.id}
                  points={`${tx},${ty - 4} ${tx - 3},${ty + 3} ${tx + 3},${ty + 3}`}
                  fill={TRAVELLER_COLORS[trav.state]}
                  stroke="white"
                  strokeWidth={0.5}
                >
                  <title>
                    {trav.id}: {trav.spareCapacityKg}kg capacity, {trav.state}
                  </title>
                </polygon>
              );
            })}

            {/* Overflow counts */}
            {countryRequests.length > 8 && (
              <text
                x={pos.x}
                y={pos.y + 18}
                textAnchor="middle"
                fontSize={6}
                fill="#94A3B8"
              >
                +{countryRequests.length - 8} more
              </text>
            )}
          </g>
        );
      })}

      {/* Singapore origin zone */}
      <g>
        <rect
          x={SINGAPORE_POS.x - 30}
          y={SINGAPORE_POS.y - 12}
          width={60}
          height={24}
          rx={4}
          fill={ALGO_COLORS[algorithm]}
          opacity={0.1}
          stroke={ALGO_COLORS[algorithm]}
          strokeWidth={1}
        />
        <text
          x={SINGAPORE_POS.x}
          y={SINGAPORE_POS.y - 2}
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          fill={ALGO_COLORS[algorithm]}
        >
          SINGAPORE
        </text>
        <text
          x={SINGAPORE_POS.x}
          y={SINGAPORE_POS.y + 8}
          textAnchor="middle"
          fontSize={6}
          fill="#64748B"
        >
          {state.volunteers.filter((v) => v.state === "Idle").length} vol.
          idle
        </text>

        {/* Volunteer squares near Singapore */}
        {state.volunteers
          .filter((v) => v.location === "Singapore")
          .map((vol, i) => (
            <rect
              key={vol.id}
              x={SINGAPORE_POS.x + 35 + i * 7}
              y={SINGAPORE_POS.y - 4}
              width={5}
              height={5}
              fill={VOLUNTEER_COLORS[vol.state]}
              stroke="white"
              strokeWidth={0.5}
              rx={1}
            >
              <title>
                {vol.id}: reliability {vol.reliability}, {vol.state}
              </title>
            </rect>
          ))}
      </g>

      {/* In-transit animation dots — requests moving along connection lines */}
      {state.requests
        .filter((r) => r.state === "InTransit")
        .slice(0, 15)
        .map((req, i) => {
          const dest = DEST_POSITIONS[req.destination];
          // Position along the line based on how long in transit
          const progress = Math.min(
            0.9,
            ((state.day - (req.matchedDay ?? state.day)) / 2) * 0.8 + 0.1
          );
          const x =
            SINGAPORE_POS.x + (dest.x - SINGAPORE_POS.x) * progress;
          const y =
            SINGAPORE_POS.y + (dest.y - SINGAPORE_POS.y) * progress;

          return (
            <circle
              key={`transit-${req.id}`}
              cx={x}
              cy={y}
              r={2.5}
              fill="#3B82F6"
              opacity={0.8}
            >
              <animate
                attributeName="opacity"
                values="0.4;1;0.4"
                dur="1.5s"
                repeatCount="indefinite"
              />
              <title>
                {req.id} in transit to {req.destination}
              </title>
            </circle>
          );
        })}

      {/* Day indicator */}
      <text x={svgWidth - 8} y={14} textAnchor="end" fontSize={10} fontWeight="bold" fill="#94A3B8">
        Day {state.day}
      </text>
    </svg>
  );
}

// ============================================================
// STAT BOX — small KPI display
// ============================================================

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-gray-50 rounded p-1.5 text-center">
      <div className="text-gray-400 text-[10px] uppercase tracking-wide">
        {label}
      </div>
      <div className="font-bold text-sm" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// ============================================================
// DAY LOG — scrollable narration
// ============================================================

function DayLog({ entries }: { entries: string[] }) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      ref={logRef}
      className="bg-gray-900 rounded p-2 h-32 overflow-y-auto font-mono text-[10px] leading-relaxed"
    >
      {entries.length === 0 ? (
        <span className="text-gray-500">
          Press Play or Step to begin...
        </span>
      ) : (
        entries.map((entry, i) => (
          <div
            key={i}
            className={
              entry.includes("✓")
                ? "text-green-400"
                : entry.includes("⚠")
                  ? "text-yellow-400"
                  : entry.includes("✗")
                    ? "text-red-400"
                    : entry.includes("★")
                      ? "text-blue-400"
                      : entry.includes("━━━")
                        ? "text-white font-bold mt-1"
                        : "text-gray-400"
            }
          >
            {entry}
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================
// COMPARISON SUMMARY — shown when all 3 algorithms complete
// ============================================================

function ComparisonSummary({
  states,
}: {
  states: Map<MatchingAlgorithm, SimulationState>;
}) {
  const rows = ALGORITHMS.map((algo) => {
    const state = states.get(algo);
    if (!state) return null;

    const total = state.requests.length;
    const fulfilled = state.requests.filter(
      (r) => r.state === "Fulfilled"
    ).length;
    const rate = total > 0 ? (fulfilled / total) * 100 : 0;

    const urgentTotal = state.requests.filter(
      (r) => r.urgency === "High"
    ).length;
    const urgentFulfilled = state.requests.filter(
      (r) => r.urgency === "High" && r.state === "Fulfilled"
    ).length;
    const urgentRate = urgentTotal > 0 ? (urgentFulfilled / urgentTotal) * 100 : 0;

    const totalWeight = state.requests
      .filter((r) => r.state === "Fulfilled")
      .reduce((s, r) => s + r.weightKg, 0);

    const fulfilledRequests = state.requests.filter(
      (r) => r.state === "Fulfilled" && r.fulfilledDay !== undefined
    );
    const avgDelivery =
      fulfilledRequests.length > 0
        ? fulfilledRequests.reduce(
            (s, r) => s + (r.fulfilledDay! - r.datePosted),
            0
          ) / fulfilledRequests.length
        : 0;

    return {
      algo,
      total,
      fulfilled,
      rate,
      urgentRate,
      totalWeight,
      avgDelivery,
    };
  }).filter(Boolean) as Array<{
    algo: MatchingAlgorithm;
    total: number;
    fulfilled: number;
    rate: number;
    urgentRate: number;
    totalWeight: number;
    avgDelivery: number;
  }>;

  // Find the best in each category
  const bestRate = Math.max(...rows.map((r) => r.rate));
  const bestUrgent = Math.max(...rows.map((r) => r.urgentRate));
  const bestWeight = Math.max(...rows.map((r) => r.totalWeight));
  const bestDelivery = Math.min(...rows.map((r) => r.avgDelivery));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-3">
        Final Comparison
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-600">Metric</th>
              {rows.map((r) => (
                <th
                  key={r.algo}
                  className="text-center py-2 px-3 font-semibold"
                  style={{ color: ALGO_COLORS[r.algo] }}
                >
                  {ALGO_LABELS[r.algo]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">Fulfillment Rate</td>
              {rows.map((r) => (
                <td
                  key={r.algo}
                  className={`text-center py-2 px-3 ${r.rate === bestRate ? "font-bold text-green-600" : ""}`}
                >
                  {r.rate.toFixed(1)}%
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">
                Urgent Fulfillment Rate
              </td>
              {rows.map((r) => (
                <td
                  key={r.algo}
                  className={`text-center py-2 px-3 ${r.urgentRate === bestUrgent ? "font-bold text-green-600" : ""}`}
                >
                  {r.urgentRate.toFixed(1)}%
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">Total Weight (kg)</td>
              {rows.map((r) => (
                <td
                  key={r.algo}
                  className={`text-center py-2 px-3 ${r.totalWeight === bestWeight ? "font-bold text-green-600" : ""}`}
                >
                  {r.totalWeight.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">
                Avg Delivery Time (days)
              </td>
              {rows.map((r) => (
                <td
                  key={r.algo}
                  className={`text-center py-2 px-3 ${r.avgDelivery === bestDelivery ? "font-bold text-green-600" : ""}`}
                >
                  {r.avgDelivery.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Fulfilled / Total</td>
              {rows.map((r) => (
                <td key={r.algo} className="text-center py-2 px-3">
                  {r.fulfilled} / {r.total}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Best value in each row highlighted in green. All 3 algorithms used the
        same seed, so they received identical request and traveller streams —
        only the matching logic differs.
      </p>
    </div>
  );
}
