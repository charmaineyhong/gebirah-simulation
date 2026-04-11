/**
 * Simulation Setup Panel
 */

import { useState } from "react";
import {
  DAILY_TARGET_DEPARTURES,
  WILLINGNESS_SCENARIOS,
  CAAS_DESTINATION_WEIGHTS,
  SEASONAL_FACTORS,
  DEFAULT_EXPIRY_DAYS,
  type WillingnessScenario,
  type UrgencyScenario,
} from "../config/constants";

interface Props {
  onRun: (scenario: WillingnessScenario, startMonth: string, platformAdoptionRate: number, requestsPerDay: number, volunteersSingapore: number, urgencyScenario: UrgencyScenario, urgentExpiryDays: number) => void;
  isRunning: boolean;
}

export default function SimulationSetup({ onRun, isRunning }: Props) {
  const [scenario, setScenario] = useState<WillingnessScenario>("likely");
  const [startMonth, setStartMonth] = useState("Jun");
  const [reachableInput, setReachableInput] = useState("10");
  const [requestsInput, setRequestsInput] = useState("15");
  const [volunteersInput, setVolunteersInput] = useState("5");
  const [urgencyScenario, setUrgencyScenario] = useState<UrgencyScenario>("normal");
  const [urgentExpiryDays, setUrgentExpiryDays] = useState(DEFAULT_EXPIRY_DAYS);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const willingnessRate = WILLINGNESS_SCENARIOS[scenario];
  const seasonalFactor = SEASONAL_FACTORS[startMonth] ?? 1;
  const afterSeasonal = Math.round(DAILY_TARGET_DEPARTURES * seasonalFactor);
  const seasonalDelta = Math.round(DAILY_TARGET_DEPARTURES * (seasonalFactor - 1));
  const willingTravellers = Math.round(afterSeasonal * willingnessRate);

  // Clamp typed values — only enforced on blur, raw string allowed during typing
  const reachableCount = Math.min(Math.max(1, parseInt(reachableInput) || 1), willingTravellers);
  const requestsPerDay = Math.max(1, parseInt(requestsInput) || 1);
  const volunteersSingapore = Math.max(1, parseInt(volunteersInput) || 1);
  const adoptionRate = willingTravellers > 0 ? reachableCount / willingTravellers : 0;

  const countryPreviews = {
    Indonesia: Math.round(reachableCount * CAAS_DESTINATION_WEIGHTS.Indonesia),
    Philippines: Math.round(reachableCount * CAAS_DESTINATION_WEIGHTS.Philippines),
    Vietnam: Math.round(reachableCount * CAAS_DESTINATION_WEIGHTS.Vietnam),
    Cambodia: Math.round(reachableCount * CAAS_DESTINATION_WEIGHTS.Cambodia),
    Myanmar: Math.round(reachableCount * CAAS_DESTINATION_WEIGHTS.Myanmar),
  };

  const supplyStatus = reachableCount < requestsPerDay;

  return (
    <div className="panel p-7">
      <p className="section-label mb-5">Configuration</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Start Month */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5 flex items-center justify-between">
            <span>Start Month</span>
            <span className="font-mono text-[0.65rem] text-zinc-500">
              {seasonalDelta >= 0 ? "+" : ""}{seasonalDelta.toLocaleString()} travellers/day
            </span>
          </label>
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-800 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            Seasonal scaling factor for traveller volume
          </p>
        </div>

        {/* Reachable by Gebirah — text input */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Willing travellers Gebirah can reach
          </label>
          <input
            type="number"
            min="1"
            max={willingTravellers}
            value={reachableInput}
            onChange={(e) => setReachableInput(e.target.value)}
            onBlur={() => setReachableInput(String(reachableCount))}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-800 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors font-mono"
            placeholder="e.g. 10"
          />
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            Min: 1 traveller · Max: {willingTravellers.toLocaleString()} travellers (all willing)
          </p>
        </div>

        {/* Willingness Scenario */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Willingness Scenario
          </label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as WillingnessScenario)}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-800 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors"
          >
            <option value="conservative">Conservative (~{Math.round(afterSeasonal * 0.03).toLocaleString()} willing/day)</option>
            <option value="likely">Likely (~{Math.round(afterSeasonal * 0.06).toLocaleString()} willing/day)</option>
            <option value="optimistic">Optimistic (~{Math.round(afterSeasonal * 0.10).toLocaleString()} willing/day)</option>
          </select>
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            ~{willingTravellers.toLocaleString()} travellers/day willing in {startMonth} · Based on CAF World Giving Index
          </p>
        </div>

        {/* Urgency Scenario */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Urgency Scenario
          </label>
          <select
            value={urgencyScenario}
            onChange={(e) => setUrgencyScenario(e.target.value as UrgencyScenario)}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-800 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors"
          >
            <option value="normal">Normal (all Low Urgency)</option>
            <option value="someUrgent">Elevated (10% High Urgency, 90% Low Urgency)</option>
            <option value="disasterResponse">Disaster (40% High Urgency, 60% Low Urgency)</option>
          </select>
          {urgencyScenario === "normal" && (
            <p className="text-[0.65rem] text-zinc-600 mt-1">
              All requests have no expiry and are served in arrival order
            </p>
          )}
          {urgencyScenario !== "normal" && (
            <div className="mt-1 space-y-0.5">
              <p className="text-[0.65rem] text-zinc-600">
                <span className="font-semibold text-zinc-700">High</span> — time-critical, expires if not matched within the expiry window
              </p>
              <p className="text-[0.65rem] text-zinc-600">
                <span className="font-semibold text-zinc-700">Low</span> — standard request, no expiry, stays in queue until matched
              </p>
            </div>
          )}
        </div>

        {/* Volunteers Singapore */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Volunteers at Changi
          </label>
          <input
            type="number"
            min="1"
            value={volunteersInput}
            onChange={(e) => setVolunteersInput(e.target.value)}
            onBlur={() => setVolunteersInput(String(volunteersSingapore))}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-800 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors font-mono"
            placeholder="e.g. 5"
          />
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            Min: 1 volunteer
          </p>
        </div>

        {/* Requests Per Day */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Donation Requests
          </label>
          <input
            type="number"
            min="1"
            value={requestsInput}
            onChange={(e) => setRequestsInput(e.target.value)}
            onBlur={() => setRequestsInput(String(requestsPerDay))}
            disabled={isRunning}
            className="w-full border border-edge rounded-lg px-3 py-2 text-sm bg-inset text-zinc-800 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-40 transition-colors font-mono"
            placeholder="e.g. 15"
          />
          <p className="text-[0.65rem] text-zinc-600 mt-1">
            Min: 1 request/day
          </p>
        </div>

        {/* Expiry Days — only shown when urgency scenario has High requests */}
        {urgencyScenario !== "normal" && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              High Urgency Expiry{" "}
              <span className="font-mono text-accent">{urgentExpiryDays} days</span>
            </label>
            <input
              type="range"
              min="3"
              max="10"
              step="1"
              value={urgentExpiryDays}
              onChange={(e) => setUrgentExpiryDays(Number(e.target.value))}
              disabled={isRunning}
              className="w-full mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-[0.65rem] text-zinc-600 mt-1">
              <span>3 days</span>
              <span>10 days</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview: Traveller Funnel */}
      <div className="mt-6 rounded-[1rem] bg-gradient-to-br from-white/80 to-inset border border-edge overflow-hidden">
        <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between">
          <p className="section-label">Traveller funnel - Changi Airport</p>
          <span className={`text-[0.65rem] font-mono font-medium ${supplyStatus ? "text-algo-weight" : "text-algo-fifo"}`}>
            {supplyStatus ? "UNDERSUPPLY" : "SUPPLY OK"}
          </span>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between items-center text-zinc-600">
            <span>Daily departures</span>
            <span className="font-mono text-zinc-800">24,218 travellers</span>
          </div>
          <div className="flex justify-between items-center text-zinc-600">
            <span>To 5 target countries</span>
            <span className="font-mono text-zinc-800">{DAILY_TARGET_DEPARTURES.toLocaleString()} travellers</span>
          </div>
          <div className="flex justify-between items-center text-zinc-600">
            <span>After {startMonth} seasonal adjustment</span>
            <span className="font-mono text-zinc-800">{afterSeasonal.toLocaleString()} travellers</span>
          </div>
          <div className="flex justify-between items-center text-zinc-600">
            <span>Willing to carry donations</span>
            <span className="font-mono text-zinc-800">{willingTravellers.toLocaleString()} travellers</span>
          </div>
          <div className="h-px bg-edge my-1" />
          <div className="flex justify-between items-center">
            <span className="text-zinc-600">Reachable by Gebirah</span>
            <span className="font-mono text-zinc-800">{reachableCount} / {willingTravellers.toLocaleString()} willing travellers</span>
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
              <div className="font-mono text-sm font-semibold text-zinc-800 mt-0.5">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onRun(scenario, startMonth, adoptionRate, requestsPerDay, volunteersSingapore, urgencyScenario, urgentExpiryDays)}
            disabled={isRunning}
              className="px-7 py-2.5 bg-gradient-to-r from-accent via-accent-dim to-accent-bright text-white text-sm font-semibold rounded-xl shadow-[0_14px_28px_rgba(49,68,221,0.18)] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
          <span className="text-[0.65rem] text-zinc-500">
            3 algorithms × 50 runs × 30 days
          </span>
        </div>

      </div>
    </div>
  );
}
