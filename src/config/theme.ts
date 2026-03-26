import type { CSSProperties } from "react";
import type { MatchingAlgorithm } from "./constants";

type AlgorithmTheme = {
  label: string;
  hex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  tintClass: string;
};

export const BRAND_PALETTE = {
  logoBlue: "#2d9bef",
  royalIndigo: "#3144dd",
  gebirahViolet: "#8428bc",
  softLilac: "#ece8fb",
  mist: "#f7f4ff",
  ink: "#24194b",
  mutedInk: "#72689a",
  grid: "rgba(109, 93, 180, 0.18)",
  edge: "rgba(97, 78, 173, 0.18)",
  edgeStrong: "rgba(97, 78, 173, 0.34)",
  danger: "#cb5f7c",
} as const;

export const ALGORITHM_THEMES: Record<MatchingAlgorithm, AlgorithmTheme> = {
  fifo: {
    label: "FIFO",
    hex: BRAND_PALETTE.logoBlue,
    textClass: "text-algo-fifo",
    bgClass: "bg-algo-fifo",
    borderClass: "border-algo-fifo/30",
    tintClass: "bg-algo-fifo/10",
  },
  priority: {
    label: "Priority",
    hex: BRAND_PALETTE.royalIndigo,
    textClass: "text-algo-priority",
    bgClass: "bg-algo-priority",
    borderClass: "border-algo-priority/30",
    tintClass: "bg-algo-priority/10",
  },
  weightOptimised: {
    label: "Weight-Optimised",
    hex: BRAND_PALETTE.gebirahViolet,
    textClass: "text-algo-weight",
    bgClass: "bg-algo-weight",
    borderClass: "border-algo-weight/30",
    tintClass: "bg-algo-weight/10",
  },
};

const FALLBACK_ALGORITHM_THEME: AlgorithmTheme = {
  label: "Algorithm",
  hex: BRAND_PALETTE.mutedInk,
  textClass: "text-zinc-600",
  bgClass: "bg-zinc-400",
  borderClass: "border-edge",
  tintClass: "bg-zinc-400/10",
};

export function getAlgorithmTheme(algorithm: string): AlgorithmTheme {
  return (
    ALGORITHM_THEMES[algorithm as MatchingAlgorithm] ?? FALLBACK_ALGORITHM_THEME
  );
}

export const CHART_GRID = BRAND_PALETTE.grid;
export const CHART_CURSOR_FILL = "rgba(49, 68, 221, 0.06)";

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.96)",
  borderRadius: 12,
  border: `1px solid ${BRAND_PALETTE.edge}`,
  color: BRAND_PALETTE.ink,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 12,
  boxShadow: "0 18px 36px rgba(49, 39, 103, 0.12)",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: BRAND_PALETTE.ink,
  fontFamily: "Sora, sans-serif",
  fontWeight: 600,
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: BRAND_PALETTE.ink,
};

export const CHART_AXIS_LABEL_STYLE = {
  fill: "#8d83b5",
  fontSize: 11,
};

export const TABLE_DIVIDER = `1px solid ${BRAND_PALETTE.edge}`;
