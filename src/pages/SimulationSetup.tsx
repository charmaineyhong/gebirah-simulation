/**
 * Simulation Setup Panel
 */

import { useState } from "react";
import {
  DAILY_TARGET_DEPARTURES,
  WILLINGNESS_SCENARIOS,
  CAAS_DESTINATION_WEIGHTS,
  type WillingnessScenario,
} from "../config/constants";

interface Props {
  onRun: (scenario: WillingnessScenario, numRuns: number, startMonth: string, platformAdoptionRate: number) => void;
  onWatchLive: (scenario: WillingnessScenario, startMonth: string, platformAdoptionRate: number) => void;
  isRunning: boolean;
}

export default function SimulationSetup({ onRun, onWatchLive, isRunning }: Props) {
  const [scenario, setScenario] = useState<WillingnessScenario>("likely");
  const [numRuns, setNumRuns] = useState(20);
  const [startMonth, setStartMonth] = useState("Jun");
  const [adoptionRate, setAdoptionRate] = useState(0.01);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const willingnessRate = WILLINGNESS_SCENARIOS[scenario];
  const effectiveRate = willingnessRate * adoptionRate;
  const expectedTravellersPerDay = Math.round(DAILY_TARGET_DEPARTURES * effectiveRate * 10) / 10;

  const countryPreviews = {
    Indonesia: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Indonesia * effectiveRate * 10) / 10,
    Philippines: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Philippines * effectiveRate * 10) / 10,
    Vietnam: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Vietnam * effectiveRate * 10) / 10,
    Cambodia: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Cambodia * effectiveRate * 10) / 10,
    Myanmar: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Myanmar * effectiveRate * 10) / 10,
  };

  const supplyStatus = expectedTravellersPerDay < 15;

  return (
    <div className="panel p-7">
      <p className="section-label mb-5">Configuration</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Willingness Scenario */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Willingness Scenario
          </label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as WillingnessScenario)}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors"
          >
            <option value="conservative">Conservative (3% willing)</option>
            <option value="likely">Likely (6% willing)</option>
            <option value="optimistic">Optimistic (10% willing)</option>
          </select>
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            Based on CAF World Giving Index
          </p>
        </div>

        {/* Operational Reach Rate */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Operational Reach{" "}
            <span className="font-mono text-accent">{(adoptionRate * 100).toFixed(1)}%</span>
            {adoptionRate >= 0.059 && <span className="text-emerald-400 ml-1 font-normal text-[0.65rem]">MAX</span>}
          </label>
          <input
            type="range"
            min="0.001"
            max="0.06"
            step="0.001"
            value={adoptionRate}
            onChange={(e) => setAdoptionRate(Number(e.target.value))}
            disabled={isRunning}
            className="w-full mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[0.65rem] text-zinc-600 mt-1">
            <span>0.1%</span>
            <span>6.0%</span>
          </div>
        </div>

        {/* Number of Runs */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Monte Carlo Runs
          </label>
          <select
            value={numRuns}
            onChange={(e) => setNumRuns(Number(e.target.value))}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors"
          >
            <option value={5}>5 runs (fast)</option>
            <option value={10}>10 runs</option>
            <option value={20}>20 runs (recommended)</option>
            <option value={50}>50 runs (precise)</option>
          </select>
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            More runs = tighter confidence intervals
          </p>
        </div>

        {/* Start Month */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Start Month
          </label>
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            Seasonal scaling factor for traveller volume
          </p>
        </div>
      </div>

      {/* Live Preview: Traveller Funnel */}
      <div className="mt-6 rounded-lg bg-inset border border-edge overflow-hidden">
        <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between">
          <p className="section-label">Traveller funnel — Changi Airport</p>
          <span className={`text-[0.65rem] font-mono font-medium ${supplyStatus ? "text-amber-400" : "text-emerald-400"}`}>
            {supplyStatus ? "UNDERSUPPLY" : "SUPPLY OK"}
          </span>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between items-center text-zinc-500">
            <span>Daily departures</span>
            <span className="font-mono text-zinc-300">24,218</span>
          </div>
          <div className="flex justify-between items-center text-zinc-500">
            <span>To 5 target countries</span>
            <span className="font-mono text-zinc-300">{DAILY_TARGET_DEPARTURES.toLocaleString()}</span>
          </div>
          <div className="h-px bg-edge my-1" />
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">
              {(willingnessRate * 100).toFixed(0)}% willing &times; {(adoptionRate * 100).toFixed(1)}% reach
            </span>
            <span className="font-mono font-semibold text-accent text-base">
              {expectedTravellersPerDay}<span className="text-xs text-zinc-500 font-normal ml-1">/day</span>
            </span>
          </div>
        </div>

        {/* Country grid */}
        <div className="grid grid-cols-5 border-t border-edge">
          {(Object.entries(countryPreviews) as [string, number][]).map(([country, count], i) => (
            <div
              key={country}
              className={`py-3 px-2 text-center ${i < 4 ? "border-r border-edge" : ""}`}
            >
              <div className="text-[0.65rem] text-zinc-600 font-medium">{country}</div>
              <div className="font-mono text-sm font-semibold text-zinc-200 mt-0.5">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onRun(scenario, numRuns, startMonth, adoptionRate)}
            disabled={isRunning}
            className="px-7 py-2.5 bg-accent text-zinc-950 text-sm font-semibold rounded-lg hover:bg-accent-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </span>
            ) : (
              "Run Simulation"
            )}
          </button>
          <span className="text-[0.65rem] text-zinc-600">
            3 algorithms &times; {numRuns} runs &times; 30 days
          </span>
        </div>

        {/* Compare Live section */}
        <div className="flex items-center gap-3 pt-2 border-t border-edge">
          <button
            onClick={() => onWatchLive(scenario, startMonth, adoptionRate)}
            disabled={isRunning}
            className="px-5 py-2 rounded-lg text-sm font-medium text-accent bg-accent/10 border border-accent/25 hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Compare Algorithms Live
          </button>
          <span className="text-[0.65rem] text-zinc-600">
            All 3 algorithms side-by-side, same scenario
          </span>
        </div>
      </div>
    </div>
  );
}
