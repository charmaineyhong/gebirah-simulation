/**
 * Simulation Service
 *
 * Handles saving and loading simulation results to/from Supabase.
 * If Supabase is not configured, results are only kept in memory.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { ScenarioOutput, ExperimentResult } from "../simulation/types";

/** Save a complete scenario output to Supabase */
export async function saveSimulationRun(output: ScenarioOutput): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log("Supabase not configured - results kept in memory only");
    return null;
  }

  // Step 1: Create the simulation run record
  const { data: runData, error: runError } = await supabase
    .from("simulation_runs")
    .insert({
      willingness_scenario: output.scenario,
      num_runs: output.config.numRuns,
      start_month: output.config.startMonth,
      simulation_days: output.config.simulationDays,
      status: "completed",
    })
    .select("id")
    .single();

  if (runError) {
    console.error("Failed to save simulation run:", runError);
    return null;
  }

  const runId = runData.id;

  // Step 2: Save each algorithm's results
  for (const result of output.results) {
    const { error } = await supabase.from("experiment_results").insert({
      simulation_run_id: runId,
      algorithm: result.algorithm,
      avg_summary: result.avgSummary,
      confidence_intervals: result.confidenceIntervals,
      avg_daily_metrics: result.avgDailyMetrics,
    });

    if (error) {
      console.error(`Failed to save ${result.algorithm} results:`, error);
    }
  }

  // Step 3: Save the complete output JSON (without individual runs to save space)
  const compactOutput = {
    ...output,
    results: output.results.map((r) => ({
      ...r,
      allRuns: [], // Don't save individual runs to DB (too large)
    })),
  };

  await supabase.from("scenario_outputs").insert({
    simulation_run_id: runId,
    scenario: output.scenario,
    output_json: compactOutput,
  });

  return runId;
}

/** Load past simulation runs from Supabase */
export async function getSimulationRuns(): Promise<
  { id: string; created_at: string; willingness_scenario: string; num_runs: number }[]
> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("simulation_runs")
    .select("id, created_at, willingness_scenario, num_runs")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to fetch simulation runs:", error);
    return [];
  }

  return data || [];
}

/** Load results for a specific simulation run */
export async function getSimulationResults(
  runId: string
): Promise<ExperimentResult[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("experiment_results")
    .select("algorithm, avg_summary, confidence_intervals, avg_daily_metrics")
    .eq("simulation_run_id", runId);

  if (error) {
    console.error("Failed to fetch results:", error);
    return null;
  }

  return (data || []).map((row) => ({
    algorithm: row.algorithm,
    willingnessScenario: "likely" as const,
    numRuns: 0,
    avgSummary: row.avg_summary,
    confidenceIntervals: row.confidence_intervals,
    allRuns: [],
    avgDailyMetrics: row.avg_daily_metrics,
  }));
}
