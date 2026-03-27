/**
 * Individual insight card component
 */

import { useState } from "react";
import type { Insight } from "../../analysis/types";

interface Props {
  insight: Insight;
  defaultExpanded?: boolean;
}

const SEVERITY_STYLES = {
  critical: {
    border: "border-l-2 border-l-red-400",
    badge: "border border-red-300/80 bg-red-100 text-red-800",
    icon: "text-red-500",
  },
  warning: {
    border: "border-l-2 border-l-amber-400",
    badge: "border border-amber-300/80 bg-amber-100 text-amber-800",
    icon: "text-amber-500",
  },
  info: {
    border: "border-l-2 border-l-accent-bright",
    badge: "border border-sky-300/80 bg-sky-100 text-sky-800",
    icon: "text-sky-500",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  supply: "SUPPLY",
  demand: "DEMAND",
  volunteers: "VOLUNTEERS",
  algorithm: "ALGORITHM",
  country: "COUNTRY",
  overall: "OVERALL",
};

export default function InsightCard({ insight, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const styles = SEVERITY_STYLES[insight.severity];

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left rounded-lg bg-raised/60 ${styles.border} border border-edge px-4 py-3 transition-all hover:border-edge-strong cursor-pointer`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-1.5 py-0.5 rounded text-[0.6rem] font-mono font-semibold ${styles.badge} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]`}
        >
          {insight.severity.toUpperCase()}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-mono font-medium border border-edge bg-inset text-zinc-600">
          {CATEGORY_LABELS[insight.category] ?? insight.category.toUpperCase()}
        </span>
        <span className="ml-auto text-zinc-400 text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </div>
      <p className="text-sm font-semibold text-zinc-800 mt-1.5">{insight.title}</p>
      {expanded && (
        <p className="text-xs text-zinc-600 leading-relaxed mt-1">
          {insight.explanation}
        </p>
      )}
    </button>
  );
}
