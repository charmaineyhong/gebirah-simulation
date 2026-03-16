/**
 * Simulation Setup Panel
 * Lets the user pick willingness scenario, platform adoption rate,
 * number of runs, and start month
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
  isRunning: boolean;
}

export default function SimulationSetup({ onRun, isRunning }: Props) {
  const [scenario, setScenario] = useState<WillingnessScenario>("likely");
  const [numRuns, setNumRuns] = useState(20);
  const [startMonth, setStartMonth] = useState("Jun");
  const [adoptionRate, setAdoptionRate] = useState(0.01);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Calculate live preview of how many travellers enter the system
  const willingnessRate = WILLINGNESS_SCENARIOS[scenario];
  const effectiveRate = willingnessRate * adoptionRate;
  const expectedTravellersPerDay = Math.round(DAILY_TARGET_DEPARTURES * effectiveRate * 10) / 10;

  // Per-country preview
  const countryPreviews = {
    Indonesia: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Indonesia * effectiveRate * 10) / 10,
    Philippines: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Philippines * effectiveRate * 10) / 10,
    Vietnam: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Vietnam * effectiveRate * 10) / 10,
    Cambodia: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Cambodia * effectiveRate * 10) / 10,
    Myanmar: Math.round(DAILY_TARGET_DEPARTURES * CAAS_DESTINATION_WEIGHTS.Myanmar * effectiveRate * 10) / 10,
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Simulation Configuration
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure the simulation parameters, then click "Run Simulation" to
        compare all 3 matching algorithms.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Willingness Scenario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Willingness Scenario
          </label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as WillingnessScenario)}
            disabled={isRunning}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="conservative">Conservative (3% willing)</option>
            <option value="likely">Likely (6% willing)</option>
            <option value="optimistic">Optimistic (10% willing)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            % of travellers willing to carry donations (Based on CAF World Giving Index)
          </p>
        </div>

        {/* Operational Reach Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operational Reach: {(adoptionRate * 100).toFixed(1)}%
            {adoptionRate >= 0.059 && <span className="text-green-600 ml-1">(all willing travellers)</span>}
          </label>
          <input
            type="range"
            min="0.001"
            max="0.06"
            step="0.001"
            value={adoptionRate}
            onChange={(e) => setAdoptionRate(Number(e.target.value))}
            disabled={isRunning}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.1% (early stage)</span>
            <span>6.0% (full reach — all willing travellers)</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            % of willing travellers Gebirah can operationally manage currently
          </p>
        </div>

        {/* Number of Runs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Runs
          </label>
          <select
            value={numRuns}
            onChange={(e) => setNumRuns(Number(e.target.value))}
            disabled={isRunning}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value={5}>5 runs (fast, less accurate)</option>
            <option value={10}>10 runs</option>
            <option value={20}>20 runs (recommended)</option>
            <option value={50}>50 runs (slow, most accurate)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            More runs = more accurate averages + tighter confidence intervals
          </p>
        </div>

        {/* Start Month */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Month
          </label>
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            disabled={isRunning}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Affects seasonal scaling factor for traveller volume
          </p>
        </div>
      </div>

      {/* Live Preview: Traveller Funnel */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Number of Travellers (from Changi Airport)
        </h4>
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Daily departures from Changi:</span>
            <span className="font-mono">24,218</span>
          </div>
          <div className="flex justify-between">
            <span>→ To 5 target countries:</span>
            <span className="font-mono">{DAILY_TARGET_DEPARTURES.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>→ × {(willingnessRate * 100).toFixed(0)}% willing × {(adoptionRate * 100).toFixed(1)}% reach:</span>
            <span className="font-mono font-semibold text-blue-600">
              ~{expectedTravellersPerDay} travellers/day
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 text-xs text-center">
          {(Object.entries(countryPreviews) as [string, number][]).map(([country, count]) => (
            <div key={country} className="bg-white rounded p-2 border border-gray-200">
              <div className="font-medium text-gray-700">{country}</div>
              <div className="font-mono text-blue-600">{count}/day</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          15 requests/day vs ~{expectedTravellersPerDay} travellers/day
          {expectedTravellersPerDay < 15
            ? " — demand exceeds supply (system under stress)"
            : " — supply meets demand"}
        </p>
      </div>

      <button
        onClick={() => onRun(scenario, numRuns, startMonth, adoptionRate)}
        disabled={isRunning}
        className="mt-6 w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? "Running Simulation..." : "Run Simulation"}
      </button>
    </div>
  );
}
