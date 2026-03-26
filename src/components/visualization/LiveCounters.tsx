import type { AgentStateCounts } from "../../simulation/snapshotEngine";

interface Props {
  agentStates: AgentStateCounts | null;
  noShows: number;
  matchesToday: number;
}

interface CounterCardProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

function CounterCard({ label, value, color, icon }: CounterCardProps) {
  return (
    <div className="rounded-xl bg-surface-2/60 border border-border p-3 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 truncate">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold font-mono text-zinc-800 transition-all duration-500">
        {value}
      </div>
    </div>
  );
}

export default function LiveCounters({ agentStates, noShows, matchesToday }: Props) {
  const r = agentStates?.requests ?? { waiting: 0, inTransit: 0, fulfilled: 0, total: 0 };

  const counters: CounterCardProps[] = [
    {
      label: "Total Requests",
      value: r.total,
      color: "bg-algo-fifo/12 text-algo-fifo",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: "Waiting",
      value: r.waiting,
      color: "bg-accent/10 text-accent",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "In Transit",
      value: r.inTransit,
      color: "bg-algo-weight/10 text-algo-weight",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      ),
    },
    {
      label: "Fulfilled",
      value: r.fulfilled,
      color: "bg-algo-fifo/10 text-algo-fifo",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Matches Today",
      value: matchesToday,
      color: "bg-brand-500/12 text-brand-500",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      label: "No-Shows",
      value: noShows,
      color: "bg-red-500/15 text-red-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
      {counters.map((c) => (
        <CounterCard key={c.label} {...c} />
      ))}
    </div>
  );
}
