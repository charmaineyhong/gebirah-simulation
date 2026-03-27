/**
 * Shared types for the simulation insights system
 */

export type InsightSeverity = "info" | "warning" | "critical";

export type InsightCategory =
  | "supply"
  | "demand"
  | "volunteers"
  | "algorithm"
  | "country"
  | "overall";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  explanation: string;
  country?: string; // set when category is "country"
}
