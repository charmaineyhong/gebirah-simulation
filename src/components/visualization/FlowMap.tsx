import { COUNTRIES, type Country } from "../../config/constants";
import { BRAND_PALETTE } from "../../config/theme";
import type { AgentStateCounts, DaySnapshot } from "../../simulation/snapshotEngine";

interface Props {
  snapshot: DaySnapshot | null;
  agentStates: AgentStateCounts | null;
  algorithmLabel: string;
  algoHex: string;
  algoTextClass: string;
  algoBorderClass: string;
  isFinished: boolean;
  speed: number;
}

const SG = { x: 150, y: 20 };

const COUNTRY_POS: Record<Country, { x: number; y: number; abbr: string }> = {
  Myanmar: { x: 25, y: 155, abbr: "MM" },
  Cambodia: { x: 87, y: 155, abbr: "KH" },
  Indonesia: { x: 155, y: 155, abbr: "ID" },
  Philippines: { x: 213, y: 155, abbr: "PH" },
  Vietnam: { x: 275, y: 155, abbr: "VN" },
};

function MiniFlowDiagram({
  snapshot,
  agentStates,
  algoHex,
  isFinished,
  speed,
}: {
  snapshot: DaySnapshot | null;
  agentStates: AgentStateCounts | null;
  algoHex: string;
  isFinished: boolean;
  speed: number;
}) {
  return (
    <svg viewBox="0 0 300 175" className="w-full" style={{ maxHeight: "160px" }}>
      <defs>
        <linearGradient id={`lineGrad-${algoHex}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={algoHex} stopOpacity="0.52" />
          <stop offset="100%" stopColor={algoHex} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <circle
        cx={SG.x}
        cy={SG.y}
        r="10"
        fill="#ffffff"
        stroke={algoHex}
        strokeWidth="1.5"
      />
      <text
        x={SG.x}
        y={SG.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fill={BRAND_PALETTE.ink}
      >
        SG
      </text>

      {COUNTRIES.map((country) => {
        const position = COUNTRY_POS[country];
        const countryState = agentStates?.byCountry[country];
        const cumulativeFulfilled = countryState?.fulfilled ?? 0;
        const departedWithGoods = new Set(snapshot?.dispatchResult.departedWithGoods ?? []);
        const dispatchedToday = (snapshot?.matchesMade ?? []).filter(
          (match) =>
            match.destination === country &&
            departedWithGoods.has(match.travellerId),
        ).length;
        const midpointX = (SG.x + position.x) / 2;
        const midpointY = (SG.y + position.y) / 2 - 5;
        const brightness = Math.min(
          1,
          0.34 + Math.log2(1 + cumulativeFulfilled) * 0.1,
        );

        return (
          <g key={country}>
            <line
              x1={SG.x}
              y1={SG.y + 10}
              x2={position.x}
              y2={position.y - 12}
              stroke={`url(#lineGrad-${algoHex})`}
              strokeWidth={dispatchedToday > 0 ? "2" : "1"}
              strokeDasharray={dispatchedToday > 0 ? undefined : "4 3"}
            />

            {dispatchedToday > 0 && (
              <>
                <rect
                  x={midpointX - 8}
                  y={midpointY - 7}
                  width="16"
                  height="14"
                  rx="3"
                  fill="#ffffff"
                  fillOpacity="0.92"
                />
                <text
                  x={midpointX}
                  y={midpointY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="monospace"
                  fill={BRAND_PALETTE.royalIndigo}
                  className="fade-in"
                >
                  {dispatchedToday}
                </text>
              </>
            )}

            {dispatchedToday > 0 && !isFinished && (
              <circle r="3" fill={algoHex} opacity="0.72">
                <animateMotion
                  dur={`${1.5 / speed}s`}
                  repeatCount="1"
                  path={`M${SG.x},${SG.y + 10} L${position.x},${position.y - 12}`}
                />
              </circle>
            )}

            <circle
              cx={position.x}
              cy={position.y}
              r="11"
              fill="#ffffff"
              stroke={algoHex}
              strokeWidth="1.5"
              strokeOpacity={brightness}
            />
            <text
              x={position.x}
              y={position.y - 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="7"
              fontWeight="600"
              fill={BRAND_PALETTE.ink}
              fillOpacity={brightness}
            >
              {position.abbr}
            </text>
            <text
              x={position.x}
              y={position.y + 20}
              textAnchor="middle"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="700"
              fill={BRAND_PALETTE.logoBlue}
              fillOpacity={cumulativeFulfilled > 0 ? 0.92 : 0.36}
            >
              {cumulativeFulfilled}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Stage({
  marker,
  label,
  value,
  todayDelta,
  deltaLabel,
  valueClass,
  markerClass,
  highlight,
}: {
  marker: string;
  label: string;
  value: number;
  todayDelta?: number;
  deltaLabel?: string;
  valueClass: string;
  markerClass: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${highlight ? "py-2.5 px-2 -mx-2 rounded-lg bg-accent-bright/8" : "py-1.5"}`}
    >
      <span
        className={`w-5 h-5 rounded-full border border-edge flex items-center justify-center text-[10px] font-mono font-semibold ${markerClass}`}
      >
        {marker}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`${highlight ? "text-xl" : "text-base"} font-bold font-mono ${valueClass} transition-all duration-500`}>
            {value}
          </span>
          <span className="text-[0.6rem] text-zinc-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
      </div>
      {todayDelta !== undefined && todayDelta > 0 && (
        <span className={`text-[10px] font-mono ${valueClass} opacity-70 shrink-0`}>
          +{todayDelta} {deltaLabel}
        </span>
      )}
    </div>
  );
}

export default function FlowMap({
  snapshot,
  agentStates,
  algorithmLabel,
  algoHex,
  algoTextClass,
  algoBorderClass,
  isFinished,
  speed,
}: Props) {
  const requests = agentStates?.requests ?? {
    waiting: 0,
    matched: 0,
    inTransit: 0,
    fulfilled: 0,
    total: 0,
  };

  const todayNew = snapshot?.newRequests.length ?? 0;
  const todayMatched = snapshot?.matchesMade.length ?? 0;
  const todayFulfilled = snapshot?.arrivals.length ?? 0;
  const noShows = snapshot?.dispatchResult.volunteerNoShows ?? 0;

  const avgDelivery = agentStates?.avgDeliveryTimeDays ?? 0;
  const wastedPct = agentStates
    ? Math.round(agentStates.wastedCapacityRate * 100)
    : 0;

  return (
    <div className={`panel p-4 border ${algoBorderClass}`}>
      <div className="flex items-center mb-2 pb-2.5 border-b border-edge">
        <span className={`text-xs font-bold uppercase tracking-wider ${algoTextClass}`}>
          {algorithmLabel}
        </span>
      </div>

      <MiniFlowDiagram
        snapshot={snapshot}
        agentStates={agentStates}
        algoHex={algoHex}
        isFinished={isFinished}
        speed={speed}
      />

      <div className="space-y-0 divide-y divide-edge mt-1">
        <Stage
          marker="Q"
          label="waiting"
          value={requests.waiting}
          todayDelta={todayNew}
          deltaLabel="new"
          valueClass="text-zinc-600"
          markerClass="text-zinc-500"
        />
        <Stage
          marker="M"
          label="matched"
          value={todayMatched}
          todayDelta={todayMatched}
          deltaLabel="today"
          valueClass="text-accent"
          markerClass="text-accent"
        />
        <Stage
          marker="T"
          label="in transit"
          value={requests.inTransit}
          valueClass="text-algo-weight"
          markerClass="text-algo-weight"
        />
        <Stage
          marker="D"
          label="delivered"
          value={requests.fulfilled}
          todayDelta={todayFulfilled}
          deltaLabel="arrived"
          valueClass="text-algo-fifo"
          markerClass="text-algo-fifo"
          highlight
        />
      </div>

      <div className="mt-2 pt-2 border-t border-edge flex items-center gap-3 text-[10px] font-mono text-zinc-500">
        <span>
          Avg delivery: <span className="text-zinc-700">{avgDelivery}d</span>
        </span>
        <span className="text-zinc-500">|</span>
        <span>
          Wasted capacity:{" "}
          <span className={wastedPct > 60 ? "text-red-400" : "text-zinc-700"}>
            {wastedPct}%
          </span>
        </span>
      </div>

      {noShows > 0 && (
        <div className="mt-2 px-2 py-1 rounded bg-red-500/8 border border-red-500/15 text-[10px] text-red-400 font-mono fade-in">
          {noShows} no-show{noShows > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
