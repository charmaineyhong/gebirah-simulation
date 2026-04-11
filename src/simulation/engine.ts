/**
 * Simulation Engine
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


// MONTHS LOOKUP - maps simulation day to a month name


const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getMonthForDay(_day: number, startMonthIndex: number): string {

  return MONTH_NAMES[startMonthIndex % 12];
}


// MAIN SIMULATION FUNCTION



export function runSimulation(
  config: SimulationConfig,
  algorithm: MatchingAlgorithm,
  seed: number,
  runId: number
): SimulationRunResult {
  const rng = new SeededRNG(seed);
  const dispatchRng = new SeededRNG(seed + 1);

  // Determine start month index
  const startMonthIndex = MONTH_NAMES.indexOf(config.startMonth);
  const monthName = getMonthForDay(0, startMonthIndex >= 0 ? startMonthIndex : 0);

  // Get the matching function for this algorithm
  const matchFunction = getMatchFunction(algorithm);

  const allRequests: DonationRequest[] = [];
  const allTravellers: Traveller[] = [];
  const volunteers: Volunteer[] = generateVolunteerPool(rng, config.volunteersSingapore);

  // Daily metrics tracking
  const dailyMetrics: DailyMetrics[] = [];
  let cumulativeFulfilled = 0;

  const TRANSIT_DAYS = 2;

  // THE DAILY LOOP (30 days)

  for (let day = 1; day <= config.simulationDays; day++) {

    const newRequests = generateDonationRequests(rng, day, monthName, config.requestsPerDay, config.urgencyScenario, config.urgentExpiryDays);
    const newTravellers = generateTravellers(rng, day, monthName, config.willingnessScenario, config.platformAdoptionRate);

    allRequests.push(...newRequests);
    allTravellers.push(...newTravellers);

    for (const request of allRequests) {
      if (
        request.state === "Waiting" &&
        request.urgency === "High" &&
        request.expiryDay !== undefined &&
        day > request.expiryDay
      ) {
        request.state = "Expired";
      }
    }

    matchFunction(allRequests, allTravellers);

    const dispatchResult = dispatchVolunteers(
      dispatchRng,
      allRequests,
      allTravellers,
      volunteers,
      day
    );


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

    const fulfilled = allRequests.filter((r) => r.fulfilledDay === day).length;
    const expiredToday = allRequests.filter((r) => r.state === "Expired" && r.expiryDay === day - 1).length;
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
      requestsExpiredToday: expiredToday,
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

  // COMPUTE SUMMARY METRICS
  const summary = computeSummary(algorithm, allRequests, allTravellers, dailyMetrics);

  return {
    runId,
    seed,
    algorithm,
    summary,
    dailyMetrics,
  };
}

// COMPUTE SUMMARY METRICS


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

  // Expired requests
  const totalExpired = allRequests.filter((r) => r.state === "Expired").length;

  // Max wait time — longest any request waited before being fulfilled or ending simulation
  const SIMULATION_END = dailyMetrics.length;
  const maxWaitTime = allRequests.reduce((max, r) => {
    const endDay = r.fulfilledDay ?? SIMULATION_END;
    return Math.max(max, endDay - r.datePosted);
  }, 0);

  // Requests waiting > 20 days — count of requests that were still undelivered at day 20+
  const requestsWaitingOver20Days = allRequests.filter((r) => {
    const endDay = r.fulfilledDay ?? SIMULATION_END;
    return endDay - r.datePosted > 20;
  }).length;

  // Per-country breakdown
  const byCountry = {} as SummaryMetrics["byCountry"];
  for (const country of COUNTRIES) {
    const countryRequests = allRequests.filter((r) => r.destination === country);
    const countryFulfilled = countryRequests.filter((r) => r.state === "Fulfilled");
    const countryExpired = countryRequests.filter((r) => r.state === "Expired").length;
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
      expired: countryExpired,
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
    totalExpired,
    fulfillmentRate: Math.round(fulfillmentRate * 10000) / 10000,
    avgDeliveryTimeDays: Math.round(avgDeliveryTime * 10) / 10,
    urgentFulfillmentRate: Math.round(urgentFulfillmentRate * 10000) / 10000,
    totalWeightDeliveredKg: Math.round(totalWeightDelivered * 10) / 10,
    avgBacklogSize: Math.round(avgBacklog * 10) / 10,
    wastedCapacityRate: Math.round(wastedCapacityRate * 10000) / 10000,
    avgCapacityUtilisation: Math.round(avgCapacityUtilisation * 10000) / 10000,
    maxWaitTime,
    requestsWaitingOver20Days,
    byCountry,
  };
}
