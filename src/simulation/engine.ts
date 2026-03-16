/**
 * Simulation Engine
 *
 * This is the HEART of the simulation. It runs the daily loop for
 * 30 simulated days, exactly as described in Section 4.7.3 of the report.
 *
 * Each day, the engine:
 * 1. Generates new donation requests (Poisson arrivals, HDI-weighted)
 * 2. Generates new travellers (Changi data, Bernoulli willingness filter)
 * 3. Runs the matching algorithm (FIFO / Priority / Weight-Optimised)
 * 4. Dispatches volunteers and handles handovers
 * 5. Processes departures and arrivals
 * 6. Records daily metrics
 *
 * At the end, it computes summary metrics for the entire 30-day period.
 */

import {
  COUNTRIES,
  type MatchingAlgorithm,
} from "../config/constants";

import { SeededRNG } from "./distributions";
import { generateDonationRequests, generateTravellers, generateVolunteerPool } from "./generators";
import { getMatchFunction } from "./matching";
import { dispatchVolunteers } from "./volunteerDispatch";

import type {
  DonationRequest,
  Traveller,
  Volunteer,
  DailyMetrics,
  SummaryMetrics,
  SimulationRunResult,
  SimulationConfig,
} from "./types";

// ============================================================
// MONTHS LOOKUP - maps simulation day to a month name
// For seasonal factor lookup. We use the config's startMonth.
// ============================================================

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getMonthForDay(_day: number, startMonthIndex: number): string {
  // Each simulation "month" is ~30 days, but our simulation is only 30 days
  // so we just use the start month for all days
  return MONTH_NAMES[startMonthIndex % 12];
}

// ============================================================
// MAIN SIMULATION FUNCTION
// Runs one complete 30-day simulation with one algorithm
// ============================================================

export function runSimulation(
  config: SimulationConfig,
  algorithm: MatchingAlgorithm,
  seed: number,
  runId: number
): SimulationRunResult {
  const rng = new SeededRNG(seed);

  // Determine start month index
  const startMonthIndex = MONTH_NAMES.indexOf(config.startMonth);
  const monthName = getMonthForDay(0, startMonthIndex >= 0 ? startMonthIndex : 0);

  // Get the matching function for this algorithm
  const matchFunction = getMatchFunction(algorithm);

  // State: all agents across the simulation
  const allRequests: DonationRequest[] = [];
  const allTravellers: Traveller[] = [];
  const volunteers: Volunteer[] = generateVolunteerPool(rng);

  // Daily metrics tracking
  const dailyMetrics: DailyMetrics[] = [];
  let cumulativeFulfilled = 0;

  // Transit time: goods take 1-3 days to arrive after departure
  const TRANSIT_DAYS = 2;

  // ========================================
  // THE DAILY LOOP (30 days)
  // ========================================
  for (let day = 1; day <= config.simulationDays; day++) {
    // --- Step 1: Generate new agents for today ---
    const newRequests = generateDonationRequests(rng, day, monthName);
    const newTravellers = generateTravellers(rng, day, monthName, config.willingnessScenario, config.platformAdoptionRate);

    allRequests.push(...newRequests);
    allTravellers.push(...newTravellers);

    // --- Step 2: Run the matching algorithm ---
    // This pairs waiting requests with available travellers
    matchFunction(allRequests, allTravellers);

    // --- Step 3: Dispatch volunteers and handle handovers ---
    // Volunteers physically hand over goods at the airport
    const dispatchResult = dispatchVolunteers(
      rng,
      allRequests,
      allTravellers,
      volunteers,
      day
    );

    // --- Step 4: Process arrivals (goods that were in transit) ---
    // Requests that have been in transit for TRANSIT_DAYS arrive
    for (const request of allRequests) {
      if (
        request.state === "InTransit" &&
        request.matchedDay !== undefined &&
        day - request.matchedDay >= TRANSIT_DAYS
      ) {
        request.state = "Fulfilled";
        request.fulfilledDay = day;
      }
    }

    // --- Step 5: Record daily metrics ---
    const fulfilled = allRequests.filter((r) => r.fulfilledDay === day).length;
    cumulativeFulfilled += fulfilled;

    const backlog = allRequests.filter((r) => r.state === "Waiting").length;

    // Per-country breakdown
    const byCountry = {} as DailyMetrics["byCountry"];
    for (const country of COUNTRIES) {
      const countryRequests = newRequests.filter((r) => r.destination === country);
      const countryFulfilled = allRequests.filter(
        (r) => r.fulfilledDay === day && r.destination === country
      ).length;
      const countryBacklog = allRequests.filter(
        (r) => r.state === "Waiting" && r.destination === country
      ).length;
      const countryTravellersAvailable = newTravellers.filter(
        (t) => t.destination === country
      ).length;
      const countryTravellersMatched = allTravellers.filter(
        (t) =>
          t.state === "Matched" &&
          t.departureDay === day &&
          t.destination === country
      ).length + allTravellers.filter(
        (t) =>
          t.state === "Departed" &&
          t.departureDay === day &&
          t.destination === country &&
          t.assignedRequestIds.length > 0
      ).length;

      byCountry[country] = {
        newRequests: countryRequests.length,
        fulfilled: countryFulfilled,
        backlog: countryBacklog,
        travellersAvailable: countryTravellersAvailable,
        travellersMatched: countryTravellersMatched,
      };
    }

    const totalWeightToday = allRequests
      .filter((r) => r.fulfilledDay === day)
      .reduce((sum, r) => sum + r.weightKg, 0);

    dailyMetrics.push({
      day,
      newRequests: newRequests.length,
      requestsFulfilledToday: fulfilled,
      cumulativeFulfilled,
      backlogSize: backlog,
      travellersAvailable: newTravellers.length,
      travellersMatched: dispatchResult.departedWithGoods.length,
      travellersDepartedEmpty: dispatchResult.departedEmpty.length,
      totalWeightDeliveredToday: Math.round(totalWeightToday * 10) / 10,
      volunteerNoShows: dispatchResult.volunteerNoShows,
      byCountry,
    });
  }

  // ========================================
  // COMPUTE SUMMARY METRICS
  // ========================================
  const summary = computeSummary(algorithm, allRequests, allTravellers, dailyMetrics);

  return {
    runId,
    seed,
    algorithm,
    summary,
    dailyMetrics,
  };
}

// ============================================================
// COMPUTE SUMMARY METRICS
// Aggregates all 30 days into final numbers
// ============================================================

function computeSummary(
  algorithm: MatchingAlgorithm,
  allRequests: DonationRequest[],
  allTravellers: Traveller[],
  dailyMetrics: DailyMetrics[]
): SummaryMetrics {
  const totalGenerated = allRequests.length;
  const totalFulfilled = allRequests.filter((r) => r.state === "Fulfilled").length;
  const totalUnfulfilled = totalGenerated - totalFulfilled;

  // Fulfillment rate
  const fulfillmentRate = totalGenerated > 0 ? totalFulfilled / totalGenerated : 0;

  // Average delivery time (days from posted to fulfilled)
  const fulfilledRequests = allRequests.filter((r) => r.state === "Fulfilled" && r.fulfilledDay !== undefined);
  const avgDeliveryTime =
    fulfilledRequests.length > 0
      ? fulfilledRequests.reduce((sum, r) => sum + (r.fulfilledDay! - r.datePosted), 0) /
        fulfilledRequests.length
      : 0;

  // Urgent fulfillment rate
  const urgentRequests = allRequests.filter((r) => r.urgency === "High");
  const urgentFulfilled = urgentRequests.filter((r) => r.state === "Fulfilled").length;
  const urgentFulfillmentRate =
    urgentRequests.length > 0 ? urgentFulfilled / urgentRequests.length : 0;

  // Total weight delivered
  const totalWeightDelivered = fulfilledRequests.reduce(
    (sum, r) => sum + r.weightKg,
    0
  );

  // Average backlog size
  const avgBacklog =
    dailyMetrics.reduce((sum, d) => sum + d.backlogSize, 0) / dailyMetrics.length;

  // Wasted capacity rate (travellers who departed empty)
  const totalDeparted = allTravellers.filter((t) => t.state === "Departed").length;
  const departedEmpty = allTravellers.filter(
    (t) => t.state === "Departed" && t.assignedRequestIds.length === 0
  ).length;
  const wastedCapacityRate = totalDeparted > 0 ? departedEmpty / totalDeparted : 0;

  // Average capacity utilisation (among matched travellers)
  const matchedTravellers = allTravellers.filter(
    (t) => t.assignedRequestIds.length > 0
  );
  const avgCapacityUtilisation =
    matchedTravellers.length > 0
      ? matchedTravellers.reduce(
          (sum, t) => sum + t.usedCapacityKg / t.spareCapacityKg,
          0
        ) / matchedTravellers.length
      : 0;

  // Per-country breakdown
  const byCountry = {} as SummaryMetrics["byCountry"];
  for (const country of COUNTRIES) {
    const countryRequests = allRequests.filter((r) => r.destination === country);
    const countryFulfilled = countryRequests.filter((r) => r.state === "Fulfilled");
    const countryUnfulfilled = countryRequests.length - countryFulfilled.length;

    const countryAvgDelivery =
      countryFulfilled.length > 0
        ? countryFulfilled
            .filter((r) => r.fulfilledDay !== undefined)
            .reduce((sum, r) => sum + (r.fulfilledDay! - r.datePosted), 0) /
          countryFulfilled.length
        : 0;

    byCountry[country] = {
      totalRequests: countryRequests.length,
      fulfilled: countryFulfilled.length,
      unfulfilled: countryUnfulfilled,
      fulfillmentRate:
        countryRequests.length > 0
          ? countryFulfilled.length / countryRequests.length
          : 0,
      avgDeliveryTimeDays: Math.round(countryAvgDelivery * 10) / 10,
    };
  }

  return {
    algorithm,
    totalRequestsGenerated: totalGenerated,
    totalRequestsFulfilled: totalFulfilled,
    totalRequestsUnfulfilled: totalUnfulfilled,
    fulfillmentRate: Math.round(fulfillmentRate * 10000) / 10000,
    avgDeliveryTimeDays: Math.round(avgDeliveryTime * 10) / 10,
    urgentFulfillmentRate: Math.round(urgentFulfillmentRate * 10000) / 10000,
    totalWeightDeliveredKg: Math.round(totalWeightDelivered * 10) / 10,
    avgBacklogSize: Math.round(avgBacklog * 10) / 10,
    wastedCapacityRate: Math.round(wastedCapacityRate * 10000) / 10000,
    avgCapacityUtilisation: Math.round(avgCapacityUtilisation * 10000) / 10000,
    byCountry,
  };
}
