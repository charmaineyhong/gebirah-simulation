import { useEffect, useRef } from "react";
import type { DaySnapshot } from "../../simulation/snapshotEngine";
import { COUNTRIES } from "../../config/constants";

interface Props {
  snapshots: DaySnapshot[];
  currentDay: number;
}

function summarizeDay(snap: DaySnapshot): string[] {
  const lines: string[] = [];

  // New requests (shared across all algorithms — same seed)
  if (snap.newRequests.length > 0) {
    const byCountry = COUNTRIES
      .map(c => {
        const count = snap.newRequests.filter(r => r.destination === c).length;
        return count > 0 ? `${count} ${c}` : null;
      })
      .filter(Boolean)
      .join(", ");
    lines.push(`${snap.newRequests.length} new requests (${byCountry})`);
  }

  // New travellers (shared across all algorithms — same seed)
  if (snap.newTravellers.length > 0) {
    const destinations = COUNTRIES
      .map(c => {
        const count = snap.newTravellers.filter(t => t.destination === c).length;
        return count > 0 ? `${count} ${c}` : null;
      })
      .filter(Boolean)
      .join(", ");
    lines.push(`${snap.newTravellers.length} travellers at Changi (${destinations})`);
  }

  if (lines.length === 0) {
    lines.push("No new arrivals");
  }

  return lines;
}

export default function EventLog({ snapshots, currentDay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentDay]);

  const visibleSnapshots = snapshots.slice(0, currentDay);

  return (
    <div className="panel p-4 flex flex-col" style={{ maxHeight: "280px" }}>
      <p className="text-[0.6rem] uppercase tracking-widest text-zinc-600 font-semibold mb-2">
        Shared Events (same seed)
      </p>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 text-xs scrollbar-thin">
        {visibleSnapshots.length === 0 && (
          <p className="text-zinc-600 italic">Waiting to start...</p>
        )}
        {visibleSnapshots.map((snap) => {
          const lines = summarizeDay(snap);
          return (
            <div key={snap.day} className="border-l-2 border-accent/30 pl-2.5 py-0.5">
              <span className="font-mono font-semibold text-accent">
                Day {snap.day}
              </span>
              {lines.map((line, i) => (
                <p key={i} className="text-zinc-400 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
