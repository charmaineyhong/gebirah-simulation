import { useMemo } from "react";
import type { VisualizationData } from "../../simulation/snapshotEngine";
import type { DonationRequestState } from "../../simulation/types";
import { getAlgorithmTheme } from "../../config/theme";

interface RequestCell {
  id: string;
  weightKg: number;
  urgency: "High" | "Low";
  state: DonationRequestState;
  datePosted: number;
  expiryDay?: number;
  arrivalOrder: number;
  destination: string;
}

interface TravellerSlot {
  id: string;
  spareCapacityKg: number;
  usedKg: number;
  destination: string;
  packedWeights: number[]; // individual request weights packed into this traveller
}

interface AlgoDayResult {
  dispatched: RequestCell[];
  waitingCells: RequestCell[];
  travellers: TravellerSlot[];
  totalKgSent: number;
  waiting: number;
  expired: number;
}

interface DayRow {
  day: number;
  newRequestCount: number;
  travellersCount: number;
  byAlgo: Record<string, AlgoDayResult>;
}

interface Props {
  vizDataSet: VisualizationData[];
  currentDay: number;
}

function buildDayRows(vizDataSet: VisualizationData[], upToDay: number): DayRow[] {
  // For each algo, replay snapshots to get per-day dispatched, waiting, expired
  const algoStates = new Map<string, {
    requestMap: Map<string, RequestCell>;
  }>();

  for (const viz of vizDataSet) {
    algoStates.set(viz.algorithm, { requestMap: new Map() });
  }

  const rows: DayRow[] = [];

  for (let d = 0; d < upToDay; d++) {
    const firstViz = vizDataSet[0];
    if (!firstViz || d >= firstViz.days.length) break;

    const sharedSnapshot = firstViz.days[d];
    const day = d + 1;
    const newRequestCount = sharedSnapshot.newRequests.length;
    const travellersCount = sharedSnapshot.newTravellers.length;

    const byAlgo: Record<string, AlgoDayResult> = {};

    for (const viz of vizDataSet) {
      if (d >= viz.days.length) continue;
      const snapshot = viz.days[d];
      const state = algoStates.get(viz.algorithm)!;
      const { requestMap } = state;

      // Add new requests
      for (let i = 0; i < snapshot.newRequests.length; i++) {
        const req = snapshot.newRequests[i];
        requestMap.set(req.id, {
          id: req.id,
          weightKg: req.weightKg,
          urgency: req.urgency as "High" | "Low",
          state: "Waiting",
          datePosted: req.datePosted,
          expiryDay: req.expiryDay,
          arrivalOrder: i + 1,
          destination: req.destination,
        });
      }

      // Expire
      let expiredToday = 0;
      for (const cell of requestMap.values()) {
        if (
          cell.state === "Waiting" &&
          cell.urgency === "High" &&
          cell.expiryDay !== undefined &&
          day > cell.expiryDay
        ) {
          cell.state = "Expired";
          expiredToday++;
        }
      }

      // Treat all matched requests as dispatched (ignore volunteer no-shows for viz clarity)
      const dispatched: RequestCell[] = [];
      for (const match of snapshot.matchesMade) {
        const cell = requestMap.get(match.requestId);
        if (cell) {
          cell.state = "InTransit";
          dispatched.push({ ...cell });
        }
      }

      // Fulfil arrivals
      for (const reqId of snapshot.arrivals) {
        const cell = requestMap.get(reqId);
        if (cell) cell.state = "Fulfilled";
      }

      const waitingCells = Array.from(requestMap.values()).filter(r => r.state === "Waiting");
      const totalKgSent = dispatched.reduce((sum, r) => sum + r.weightKg, 0);

      // Show all matched requests in traveller baggage (ignoring volunteer no-shows)
      const travellerPacked = new Map<string, number[]>();
      for (const match of snapshot.matchesMade) {
        if (!travellerPacked.has(match.travellerId)) travellerPacked.set(match.travellerId, []);
        travellerPacked.get(match.travellerId)!.push(match.weightKg);
      }
      // Show travellers that got packed first, then empty ones (cap total at 8)
      const allTravellerSlots = snapshot.newTravellers
        .filter(t => t.spareCapacityKg >= 1)
        .map(t => {
          const packed = travellerPacked.get(t.id) ?? [];
          const usedKg = Math.round(packed.reduce((s, w) => s + w, 0) * 10) / 10;
          return {
            id: t.id,
            spareCapacityKg: t.spareCapacityKg,
            usedKg,
            destination: t.destination,
            packedWeights: packed,
          };
        });
      const packedTravellers = allTravellerSlots.filter(t => t.packedWeights.length > 0);
      const emptyTravellers = allTravellerSlots.filter(t => t.packedWeights.length === 0).slice(0, Math.max(0, 6 - packedTravellers.length));
      const travellers: TravellerSlot[] = [...packedTravellers, ...emptyTravellers];

      byAlgo[viz.algorithm] = {
        dispatched,
        waitingCells,
        travellers,
        totalKgSent: Math.round(totalKgSent * 10) / 10,
        waiting: waitingCells.length,
        expired: expiredToday,
      };
    }

    rows.push({ day, newRequestCount, travellersCount, byAlgo });
  }

  return rows;
}

function RequestSquare({ cell, currentDay, dimmed }: { cell: RequestCell; currentDay: number; dimmed?: boolean }) {
  const isUrgent = cell.urgency === "High";
  const daysLeft =
    isUrgent && cell.expiryDay !== undefined
      ? cell.expiryDay - currentDay + 1
      : null;

  const colorClass = dimmed
    ? isUrgent
      ? "bg-red-100 border border-red-400 text-red-400"
      : "bg-zinc-200 border border-zinc-400 text-zinc-500"
    : isUrgent
      ? "bg-red-100 border-2 border-red-500 text-red-700"
      : "bg-green-100 border border-green-400 text-green-700";

  const orderColor = dimmed ? "text-zinc-600" : isUrgent ? "text-red-500" : "text-green-600";

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded font-mono font-bold transition-all duration-300 ${colorClass}`}
      style={{ width: 48, height: 52, flexShrink: 0 }}
      title={`Arrived #${cell.arrivalOrder} on day ${cell.datePosted} | ${cell.weightKg}kg | ${cell.urgency} urgency | ${dimmed ? "Still waiting" : "Sent out"}`}
    >
      <span className={`text-[9px] font-bold leading-none ${orderColor}`}>#{cell.arrivalOrder}</span>
      <span className="text-[12px] leading-none">{cell.weightKg}</span>
      <span className={`text-[7px] leading-none font-bold ${dimmed ? "text-zinc-600" : "opacity-60"}`}>{cell.destination.slice(0, 2).toUpperCase()}</span>
      {daysLeft !== null && daysLeft >= 0 && (
        <span className={`absolute top-0.5 right-1 text-[8px] font-bold leading-none ${dimmed ? "text-red-300" : "text-red-600"}`}>
          {daysLeft}d
        </span>
      )}
    </div>
  );
}

function TravellerBar({ slot }: { slot: TravellerSlot }) {
  return (
    <div className="flex items-start gap-2 text-[10px] font-mono">
      <span className="text-zinc-600 font-bold w-6 shrink-0 pt-0.5">{slot.destination.slice(0, 2).toUpperCase()}</span>
      <span className="text-zinc-600 font-bold shrink-0 pt-0.5">{slot.spareCapacityKg}kg</span>
      <span className="text-zinc-500 pt-0.5">→</span>
      {slot.packedWeights.length === 0 ? (
        <span className="text-zinc-500 pt-0.5">empty</span>
      ) : (
        <span className="text-blue-500 font-bold">
          {slot.packedWeights.map((w, i) => (
            <span key={i}>{i > 0 && <span className="text-zinc-500 font-normal"> + </span>}{w}</span>
          ))}
          <span className="text-zinc-600 font-bold ml-1">= {slot.usedKg}kg</span>
        </span>
      )}
    </div>
  );
}

function bestAlgo(rows: DayRow[], day: number, key: "totalKgSent" | "waiting" | "expired", highest: boolean): string[] {
  const row = rows.find(r => r.day === day);
  if (!row) return [];
  const values = Object.entries(row.byAlgo).map(([algo, result]) => ({ algo, val: result[key] }));
  const best = highest
    ? Math.max(...values.map(v => v.val))
    : Math.min(...values.map(v => v.val));
  // Only highlight if there's an actual difference
  const allSame = values.every(v => v.val === values[0].val);
  if (allSame) return [];
  return values.filter(v => v.val === best).map(v => v.algo);
}

export default function RequestQueueViz({ vizDataSet, currentDay }: Props) {
  const rows = useMemo(
    () => buildDayRows(vizDataSet, currentDay),
    [vizDataSet, currentDay]
  );

  const algorithms = vizDataSet.map(v => v.algorithm);
  const themes = Object.fromEntries(algorithms.map(a => [a, getAlgorithmTheme(a)]));

  // Show last 5 days
  const visibleRows = rows.slice(-5);

  if (currentDay === 0) {
    return (
      <div className="panel p-6 text-center text-zinc-400 text-sm italic">
        Waiting to start...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
          Daily Comparison
        </span>
        <div className="flex gap-3">
          {algorithms.map(algo => (
            <span key={algo} className={`text-[10px] font-semibold ${themes[algo].textClass}`}>
              {themes[algo].label}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-green-100 border border-green-400 inline-block" />
          Sent out (low urgency)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-red-100 border-2 border-red-500 inline-block" />
          Sent out (urgent) — corner = days left
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-zinc-50 border border-zinc-200 inline-block" />
          Still waiting (not picked)
        </span>
        <span className="flex items-center gap-1">
          <span className="text-green-600 font-bold">✓</span>
          Best that day
        </span>
      </div>

      {/* Day rows */}
      <div className="flex flex-col gap-3">
        {visibleRows.map((row) => {
          const bestKg = bestAlgo(rows, row.day, "totalKgSent", true);
          const bestWaiting = bestAlgo(rows, row.day, "waiting", false);
          const worstExpired = bestAlgo(rows, row.day, "expired", false);

          return (
            <div key={row.day} className="panel p-4 space-y-3">
              {/* Day header */}
              <div className="flex items-center gap-3 pb-2 border-b border-edge">
                <span className="text-sm font-bold font-mono text-zinc-700">DAY {row.day}</span>
                <span className="text-xs text-zinc-400">
                  {row.newRequestCount} request{row.newRequestCount !== 1 ? "s" : ""} arrived
                </span>
                <span className="text-zinc-300">|</span>
                <span className="text-xs text-zinc-400">
                  {row.travellersCount} traveller{row.travellersCount !== 1 ? "s" : ""} at Changi
                </span>
              </div>

              {/* Algorithm columns */}
              <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${algorithms.length}, 1fr)` }}>
                {algorithms.map((algo) => {
                  const result = row.byAlgo[algo];
                  const theme = themes[algo];
                  if (!result) return null;

                  return (
                    <div key={algo} className="space-y-2">
                      {/* Algo label */}
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${theme.textClass}`}>
                        {theme.label}
                      </span>

                      {/* Sent out */}
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Sent out</div>
                        <div className="flex flex-wrap gap-1 min-h-[42px]">
                          {result.dispatched.length === 0 ? (
                            <span className="text-[10px] text-zinc-300 italic self-center">nothing sent</span>
                          ) : (
                            [...result.dispatched]
                              .sort((a, b) => a.datePosted !== b.datePosted ? a.datePosted - b.datePosted : a.arrivalOrder - b.arrivalOrder)
                              .map((cell) => (
                                <RequestSquare key={cell.id} cell={cell} currentDay={currentDay} dimmed={false}/>
                              ))
                          )}
                        </div>
                      </div>

                      {/* Traveller baggage */}
                      {result.travellers.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">
                            Traveller baggage space
                          </div>
                          <div className="flex flex-col gap-1">
                            {result.travellers.map(slot => (
                              <TravellerBar key={slot.id} slot={slot} />
                            ))}
                            {result.travellers.filter(t => t.packedWeights.length === 0).length > 0 && (
                              <span className="text-[9px] text-zinc-300 font-mono">+ more empty travellers</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Still waiting */}
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Still waiting</div>
                        <div className="flex flex-wrap gap-1 min-h-[42px]">
                          {result.waitingCells.length === 0 ? (
                            <span className="text-[10px] text-zinc-300 italic self-center">none</span>
                          ) : (
                            <>
                              {result.waitingCells.slice(0, 20).map((cell) => (
                                <RequestSquare key={cell.id} cell={cell} currentDay={currentDay} dimmed={true}/>
                              ))}
                              {result.waitingCells.length > 20 && (
                                <span className="text-[10px] text-zinc-300 self-center font-mono">
                                  +{result.waitingCells.length - 20} more
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="space-y-0.5 text-[11px] font-mono">
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Sent:</span>
                          <span className={`font-bold ${bestKg.includes(algo) ? "text-green-600" : "text-zinc-600"}`}>
                            {result.totalKgSent} kg
                            {bestKg.includes(algo) && <span className="ml-1 text-green-500">✓ most</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Waiting:</span>
                          <span className={`font-bold ${bestWaiting.includes(algo) ? "text-green-600" : "text-zinc-600"}`}>
                            {result.waiting}
                            {bestWaiting.includes(algo) && <span className="ml-1 text-green-500">✓ least</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Expired:</span>
                          <span className={`font-bold ${result.expired > 0 ? "text-red-500" : "text-zinc-400"}`}>
                            {result.expired}
                            {worstExpired.includes(algo) && result.expired === 0 && (
                              <span className="ml-1 text-green-500">✓ none</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
