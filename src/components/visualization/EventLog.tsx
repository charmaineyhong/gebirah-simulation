import { useEffect, useRef } from "react";
import { COUNTRIES } from "../../config/constants";
import type { DaySnapshot } from "../../simulation/snapshotEngine";

interface Props {
  snapshots: DaySnapshot[];
  currentDay: number;
}

function summarizeDay(snapshot: DaySnapshot): string[] {
  const lines: string[] = [];

  if (snapshot.newRequests.length > 0) {
    const byCountry = COUNTRIES.map((country) => {
      const count = snapshot.newRequests.filter((request) => request.destination === country).length;
      return count > 0 ? `${count} ${country}` : null;
    })
      .filter(Boolean)
      .join(", ");

    lines.push(`${snapshot.newRequests.length} new requests (${byCountry})`);
  }

  if (snapshot.newTravellers.length > 0) {
    const destinations = COUNTRIES.map((country) => {
      const count = snapshot.newTravellers.filter((traveller) => traveller.destination === country).length;
      return count > 0 ? `${count} ${country}` : null;
    })
      .filter(Boolean)
      .join(", ");

    lines.push(`${snapshot.newTravellers.length} travellers at Changi (${destinations})`);
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
      <p className="text-[0.6rem] uppercase tracking-widest text-zinc-500 font-semibold mb-2">
        Shared Events (same seed)
      </p>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 text-xs scrollbar-thin">
        {visibleSnapshots.length === 0 && (
          <p className="text-zinc-500 italic">Waiting to start...</p>
        )}

        {visibleSnapshots.map((snapshot) => {
          const lines = summarizeDay(snapshot);

          return (
            <div key={snapshot.day} className="border-l-2 border-accent/30 pl-2.5 py-0.5">
              <span className="font-mono font-semibold text-accent">
                Day {snapshot.day}
              </span>
              {lines.map((line, index) => (
                <p key={index} className="text-zinc-600 leading-relaxed">
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
