import { COUNTRIES, type Country } from "../../config/constants";
import type { AgentStateCounts, DaySnapshot } from "../../simulation/snapshotEngine";

interface Props {
  snapshot: DaySnapshot | null;
  agentStates: AgentStateCounts | null;
  algorithmLabel: string;
  algoColor: string;
  algoBorderColor: string;
  isFinished: boolean;
  speed: number;
}

// --- Mini Flow Diagram ---

const SG = { x: 150, y: 20 };

const COUNTRY_POS: Record<Country, { x: number; y: number; abbr: string }> = {
  Myanmar:      { x: 25,  y: 155, abbr: "MM" },
  Cambodia:     { x: 87,  y: 155, abbr: "KH" },
  Indonesia:    { x: 155, y: 155, abbr: "ID" },
  Philippines:  { x: 213, y: 155, abbr: "PH" },
  Vietnam:      { x: 275, y: 155, abbr: "VN" },
};

function MiniFlowDiagram({
  snapshot,
  agentStates,
  algoColor,
  isFinished,
  speed,
}: {
  snapshot: DaySnapshot | null;
  agentStates: AgentStateCounts | null;
  algoColor: string;
  isFinished: boolean;
  speed: number;
}) {
  // Convert tailwind text color class to hex for SVG
  const strokeColor =
    algoColor.includes("sky") ? "#38bdf8" :
    algoColor.includes("amber") ? "#fbbf24" :
    algoColor.includes("rose") ? "#fb7185" : "#71717a";

  return (
    <svg viewBox="0 0 300 175" className="w-full" style={{ maxHeight: "160px" }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Singapore node */}
      <circle cx={SG.x} cy={SG.y} r="10" fill="#1a1a1f" stroke={strokeColor} strokeWidth="1.5" />
      <text x={SG.x} y={SG.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#d4d4d8">SG</text>

      {/* Lines + country nodes */}
      {COUNTRIES.map((country) => {
        const pos = COUNTRY_POS[country];
        const cs = agentStates?.byCountry[country];
        const cumFulfilled = cs?.fulfilled ?? 0;

        // Today's successful dispatches to this country (not cumulative inTransit)
        const departedWithGoods = new Set(snapshot?.dispatchResult.departedWithGoods ?? []);
        const dispatchedToday = (snapshot?.matchesMade ?? [])
          .filter(m => m.destination === country && departedWithGoods.has(m.travellerId))
          .length;

        // Line midpoint for label
        const mx = (SG.x + pos.x) / 2;
        const my = (SG.y + pos.y) / 2 - 5;

        // Brightness scales with cumulative fulfilled (log curve so all countries stay visible)
        const brightness = Math.min(1, 0.3 + Math.log2(1 + cumFulfilled) * 0.1);

        return (
          <g key={country}>
            {/* Connection line */}
            <line
              x1={SG.x} y1={SG.y + 10}
              x2={pos.x} y2={pos.y - 12}
              stroke="url(#lineGrad)"
              strokeWidth={dispatchedToday > 0 ? "2" : "1"}
              strokeDasharray={dispatchedToday > 0 ? undefined : "4 3"}
            />

            {/* Today's dispatch count on line */}
            {dispatchedToday > 0 && (
              <>
                <rect
                  x={mx - 8} y={my - 7}
                  width="16" height="14" rx="3"
                  fill="#09090b" fillOpacity="0.85"
                />
                <text
                  x={mx} y={my + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="9" fontWeight="700" fontFamily="monospace"
                  fill="#34d399"
                  className="fade-in"
                >
                  {dispatchedToday}
                </text>
              </>
            )}

            {/* Dispatch dot animation — only for today's new dispatches */}
            {dispatchedToday > 0 && !isFinished && (
              <circle r="3" fill={strokeColor} opacity="0.7">
                <animateMotion
                  dur={`${1.5 / speed}s`}
                  repeatCount="1"
                  path={`M${SG.x},${SG.y + 10} L${pos.x},${pos.y - 12}`}
                />
              </circle>
            )}

            {/* Country node */}
            <circle
              cx={pos.x} cy={pos.y}
              r="11"
              fill="#1a1a1f"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeOpacity={brightness}
            />
            <text
              x={pos.x} y={pos.y - 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="7" fontWeight="600"
              fill="#d4d4d8" fillOpacity={brightness}
            >
              {pos.abbr}
            </text>
            {/* Cumulative count below node */}
            <text
              x={pos.x} y={pos.y + 20}
              textAnchor="middle"
              fontSize="8" fontFamily="monospace" fontWeight="700"
              fill="#34d399" fillOpacity={cumFulfilled > 0 ? 0.9 : 0.3}
            >
              {cumFulfilled}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// --- Pipeline Stage ---

function Stage({
  icon,
  label,
  value,
  todayDelta,
  deltaLabel,
  color,
  highlight,
}: {
  icon: string;
  label: string;
  value: number;
  todayDelta?: number;
  deltaLabel?: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${highlight ? "py-2.5 px-2 -mx-2 rounded-lg bg-emerald-500/8" : "py-1.5"}`}>
      <span className="text-sm w-5 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`${highlight ? "text-xl" : "text-base"} font-bold font-mono ${color} transition-all duration-500`}>
            {value}
          </span>
          <span className={`text-[0.6rem] ${highlight ? "text-zinc-500" : "text-zinc-600"} uppercase tracking-wider`}>{label}</span>
        </div>
      </div>
      {todayDelta !== undefined && todayDelta > 0 && (
        <span className={`text-[10px] font-mono ${color} opacity-70 shrink-0`}>
          +{todayDelta} {deltaLabel}
        </span>
      )}
    </div>
  );
}

// --- Main FlowMap ---

export default function FlowMap({
  snapshot,
  agentStates,
  algorithmLabel,
  algoColor,
  algoBorderColor,
  isFinished,
  speed,
}: Props) {
  const r = agentStates?.requests ?? { waiting: 0, matched: 0, inTransit: 0, fulfilled: 0, total: 0 };

  const todayNew = snapshot?.newRequests.length ?? 0;
  const todayMatched = snapshot?.matchesMade.length ?? 0;
  const todayFulfilled = snapshot?.arrivals.length ?? 0;
  const noShows = snapshot?.dispatchResult.volunteerNoShows ?? 0;

  const pct = r.total > 0 ? ((r.fulfilled / r.total) * 100).toFixed(1) : "0.0";
  const avgDelivery = agentStates?.avgDeliveryTimeDays ?? 0;
  const wastedPct = agentStates ? Math.round(agentStates.wastedCapacityRate * 100) : 0;

  return (
    <div className={`panel p-4 border ${algoBorderColor}`}>
      {/* Algorithm header */}
      <div className="flex items-center justify-between mb-2 pb-2.5 border-b border-edge">
        <span className={`text-xs font-bold uppercase tracking-wider ${algoColor}`}>
          {algorithmLabel}
        </span>
        <span className={`text-sm font-bold font-mono ${algoColor}`}>
          {pct}%
        </span>
      </div>

      {/* Mini flow diagram */}
      <MiniFlowDiagram
        snapshot={snapshot}
        agentStates={agentStates}
        algoColor={algoColor}
        isFinished={isFinished}
        speed={speed}
      />

      {/* Pipeline stages */}
      <div className="space-y-0 divide-y divide-zinc-800/40 mt-1">
        <Stage
          icon="📦"
          label="waiting"
          value={r.waiting}
          todayDelta={todayNew}
          deltaLabel="new"
          color="text-zinc-500"
        />
        <Stage
          icon="🤝"
          label="matched"
          value={todayMatched}
          todayDelta={todayMatched}
          deltaLabel="today"
          color="text-cyan-400"
        />
        <Stage
          icon="✈️"
          label="in transit"
          value={r.inTransit}
          color="text-violet-400"
        />
        <Stage
          icon="✅"
          label="delivered"
          value={r.fulfilled}
          todayDelta={todayFulfilled}
          deltaLabel="arrived"
          color="text-emerald-400"
          highlight
        />
      </div>

      {/* Secondary stats */}
      <div className="mt-2 pt-2 border-t border-zinc-800/40 flex items-center gap-3 text-[10px] font-mono text-zinc-500">
        <span>
          Avg delivery: <span className="text-zinc-300">{avgDelivery}d</span>
        </span>
        <span className="text-zinc-700">|</span>
        <span>
          Wasted capacity: <span className={wastedPct > 60 ? "text-red-400" : "text-zinc-300"}>{wastedPct}%</span>
        </span>
      </div>

      {/* No-show alert */}
      {noShows > 0 && (
        <div className="mt-2 px-2 py-1 rounded bg-red-500/8 border border-red-500/15 text-[10px] text-red-400 font-mono fade-in">
          {noShows} no-show{noShows > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
