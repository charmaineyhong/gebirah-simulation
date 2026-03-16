/**
 * Experiment Runner
 *
 * 1. For each matching algorithm (FIFO, Priority, Weight-Optimised):
 *    - Run the simulation multiple times with different random seeds
 *    - Each run produces slightly different results (because of randomness)
 *    - Average all runs together to get reliable results
 *    - Calculate 95% confidence intervals (error bars)
 *
 * 2. The independent variable is the matching algorithm
 *    The dependent variables are the output metrics
 *    The controlled variables are: same agent data, same arrival rates,
 *    same distributions (controlled by using the same base seed structure)
 *
 * Output: One ExperimentResult per algorithm, containing averages +
 * confidence intervals across all runs.
 */

import {
  MATCHING_ALGORITHMS,
  SIMULATION_DAYS,
  WILLINGNESS_SCENARIOS,
  type MatchingAlgorithm,
  type WillingnessScenario,
} from "../config/constants";

import { runSimulation } from "./engine";

import type {
  SimulationConfig,
  SimulationRunResult,
  ExperimentResult,
  SummaryMetrics,
  DailyMetrics,
  ScenarioOutput,
} from "./types";

// ============================================================
// RUN A FULL EXPERIMENT
// Runs all 3 algorithms × N runs each for one willingness scenario
// ============================================================

export interface ExperimentProgress {
  currentAlgorithm: MatchingAlgorithm;
  currentRun: number;
  totalRuns: number;
  percentComplete: number;
}

export function runExperiment(
  scenario: WillingnessScenario,
  numRuns: number = 20,
  startMonth: string = "Jun",
  platformAdoptionRate: number = 0.01,
  onProgress?: (progress: ExperimentProgress) => void
): ScenarioOutput {
  const config: SimulationConfig = {
    willingnessScenario: scenario,
    platformAdoptionRate,
    numRuns,
    simulationDays: SIMULATION_DAYS,
    startMonth,
  };

  const totalSteps = MATCHING_ALGORITHMS.length * numRuns;
  let completedSteps = 0;

  const results: ExperimentResult[] = [];

  for (const algorithm of MATCHING_ALGORITHMS) {
    const runs: SimulationRunResult[] = [];

    for (let run = 0; run < numRuns; run++) {
      // Each run gets a unique seed based on algorithm + run number
      // This ensures reproducibility while giving different results per run
      const seed = hashSeed(algorithm, run);

      onProgress?.({
        currentAlgorithm: algorithm,
        currentRun: run + 1,
        totalRuns: numRuns,
        percentComplete: Math.round((completedSteps / totalSteps) * 100),
      });

      const result = runSimulation(config, algorithm, seed, run);
      runs.push(result);

      completedSteps++;
    }

    // Average all runs together
    const experimentResult = aggregateRuns(algorithm, scenario, runs);
    results.push(experimentResult);
  }

  onProgress?.({
    currentAlgorithm: "weightOptimised",
    currentRun: numRuns,
    totalRuns: numRuns,
    percentComplete: 100,
  });

  return {
    scenario,
    willingnessRate: WILLINGNESS_SCENARIOS[scenario],
    config,
    results,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// AGGREGATE RUNS
// Averages multiple simulation runs and computes confidence intervals
// ============================================================

function aggregateRuns(
  algorithm: MatchingAlgorithm,
  scenario: WillingnessScenario,
  runs: SimulationRunResult[]
): ExperimentResult {
  const numRuns = runs.length;

  // Average summary metrics across all runs
  const avgSummary = averageSummaries(algorithm, runs.map((r) => r.summary));

  // Compute 95% confidence intervals for key metrics
  const confidenceIntervals = computeConfidenceIntervals(runs.map((r) => r.summary));

  // Average daily metrics across all runs
  const avgDailyMetrics = averageDailyMetrics(runs.map((r) => r.dailyMetrics));

  return {
    algorithm,
    willingnessScenario: scenario,
    numRuns,
    avgSummary,
    confidenceIntervals,
    allRuns: runs,
    avgDailyMetrics,
  };
}

// ============================================================
// AVERAGE SUMMARIES
// Takes N summary objects and averages each field
// ============================================================

function averageSummaries(
  algorithm: MatchingAlgorithm,
  summaries: SummaryMetrics[]
): SummaryMetrics {
  const n = summaries.length;

  const avg = (field: (s: SummaryMetrics) => number) =>
    summaries.reduce((sum, s) => sum + field(s), 0) / n;

  const countries = Object.keys(summaries[0].byCountry) as (keyof SummaryMetrics["byCountry"])[];
  const byCountry = {} as SummaryMetrics["byCountry"];

  for (const country of countries) {
    byCountry[country] = {
      totalRequests: Math.round(avg((s) => s.byCountry[country].totalRequests)),
      fulfilled: Math.round(avg((s) => s.byCountry[country].fulfilled)),
      unfulfilled: Math.round(avg((s) => s.byCountry[country].unfulfilled)),
      fulfillmentRate:
        Math.round(avg((s) => s.byCountry[country].fulfillmentRate) * 10000) / 10000,
      avgDeliveryTimeDays:
        Math.round(avg((s) => s.byCountry[country].avgDeliveryTimeDays) * 10) / 10,
    };
  }

  return {
    algorithm,
    totalRequestsGenerated: Math.round(avg((s) => s.totalRequestsGenerated)),
    totalRequestsFulfilled: Math.round(avg((s) => s.totalRequestsFulfilled)),
    totalRequestsUnfulfilled: Math.round(avg((s) => s.totalRequestsUnfulfilled)),
    fulfillmentRate: Math.round(avg((s) => s.fulfillmentRate) * 10000) / 10000,
    avgDeliveryTimeDays: Math.round(avg((s) => s.avgDeliveryTimeDays) * 10) / 10,
    urgentFulfillmentRate: Math.round(avg((s) => s.urgentFulfillmentRate) * 10000) / 10000,
    totalWeightDeliveredKg: Math.round(avg((s) => s.totalWeightDeliveredKg) * 10) / 10,
    avgBacklogSize: Math.round(avg((s) => s.avgBacklogSize) * 10) / 10,
    wastedCapacityRate: Math.round(avg((s) => s.wastedCapacityRate) * 10000) / 10000,
    avgCapacityUtilisation: Math.round(avg((s) => s.avgCapacityUtilisation) * 10000) / 10000,
    byCountry,
  };
}

// ============================================================
// CONFIDENCE INTERVALS
// 95% CI = mean ± 1.96 * (standard deviation / √n)
// ============================================================

function computeConfidenceIntervals(summaries: SummaryMetrics[]) {
  return {
    fulfillmentRate: computeCI(summaries.map((s) => s.fulfillmentRate)),
    avgDeliveryTimeDays: computeCI(summaries.map((s) => s.avgDeliveryTimeDays)),
    urgentFulfillmentRate: computeCI(summaries.map((s) => s.urgentFulfillmentRate)),
    wastedCapacityRate: computeCI(summaries.map((s) => s.wastedCapacityRate)),
  };
}

function computeCI(values: number[]): { lower: number; upper: number } {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const margin = 1.96 * (stdDev / Math.sqrt(n)); // 95% CI

  return {
    lower: Math.round((mean - margin) * 10000) / 10000,
    upper: Math.round((mean + margin) * 10000) / 10000,
  };
}

// ============================================================
// AVERAGE DAILY METRICS
// Averages day-by-day metrics across all runs
// ============================================================

function averageDailyMetrics(allRuns: DailyMetrics[][]): DailyMetrics[] {
  if (allRuns.length === 0) return [];

  const numDays = allRuns[0].length;
  const numRuns = allRuns.length;
  const result: DailyMetrics[] = [];

  for (let d = 0; d < numDays; d++) {
    const dayMetrics = allRuns.map((run) => run[d]);

    const countries = Object.keys(dayMetrics[0].byCountry) as (keyof DailyMetrics["byCountry"])[];
    const byCountry = {} as DailyMetrics["byCountry"];

    for (const country of countries) {
      byCountry[country] = {
        newRequests: Math.round(
          dayMetrics.reduce((s, m) => s + m.byCountry[country].newRequests, 0) / numRuns
        ),
        fulfilled: Math.round(
          dayMetrics.reduce((s, m) => s + m.byCountry[country].fulfilled, 0) / numRuns
        ),
        backlog: Math.round(
          dayMetrics.reduce((s, m) => s + m.byCountry[country].backlog, 0) / numRuns
        ),
        travellersAvailable: Math.round(
          dayMetrics.reduce((s, m) => s + m.byCountry[country].travellersAvailable, 0) / numRuns
        ),
        travellersMatched: Math.round(
          dayMetrics.reduce((s, m) => s + m.byCountry[country].travellersMatched, 0) / numRuns
        ),
      };
    }

    result.push({
      day: d + 1,
      newRequests: Math.round(
        dayMetrics.reduce((s, m) => s + m.newRequests, 0) / numRuns
      ),
      requestsFulfilledToday: Math.round(
        dayMetrics.reduce((s, m) => s + m.requestsFulfilledToday, 0) / numRuns
      ),
      cumulativeFulfilled: Math.round(
        dayMetrics.reduce((s, m) => s + m.cumulativeFulfilled, 0) / numRuns
      ),
      backlogSize: Math.round(
        dayMetrics.reduce((s, m) => s + m.backlogSize, 0) / numRuns
      ),
      travellersAvailable: Math.round(
        dayMetrics.reduce((s, m) => s + m.travellersAvailable, 0) / numRuns
      ),
      travellersMatched: Math.round(
        dayMetrics.reduce((s, m) => s + m.travellersMatched, 0) / numRuns
      ),
      travellersDepartedEmpty: Math.round(
        dayMetrics.reduce((s, m) => s + m.travellersDepartedEmpty, 0) / numRuns
      ),
      totalWeightDeliveredToday:
        Math.round(
          (dayMetrics.reduce((s, m) => s + m.totalWeightDeliveredToday, 0) / numRuns) * 10
        ) / 10,
      volunteerNoShows: Math.round(
        dayMetrics.reduce((s, m) => s + m.volunteerNoShows, 0) / numRuns
      ),
      byCountry,
    });
  }

  return result;
}

// ============================================================
// SEED HASHING
// Creates unique but reproducible seeds for each algorithm + run
// ============================================================

function hashSeed(algorithm: string, runIndex: number): number {
  let hash = 0;
  const str = `${algorithm}-run${runIndex}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
