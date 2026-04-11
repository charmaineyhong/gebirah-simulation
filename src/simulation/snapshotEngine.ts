/**
 * Snapshot Engine
 */

import {
  COUNTRIES,
  type Country,
  type MatchingAlgorithm,
} from "../config/constants";

import { SeededRNG } from "./distributions";
import { generateDonationRequests, generateTravellers, generateVolunteerPool } from "./generators";
import { getMatchFunction } from "./matching";
import { dispatchVolunteers } from "./volunteerDispatch";
import type { DispatchResult } from "./volunteerDispatch";

import type {
  DonationRequest,
  Traveller,
  Volunteer,
  DailyMetrics,
  SimulationConfig,
} from "./types";

// SNAPSHOT TYPES

export interface MatchEvent {
  requestId: string;
  travellerId: string;
  destination: Country;
  weightKg: number;
  urgency: string;
}

export interface AgentStateCounts {
  requests: {
    waiting: number;
    matched: number;
    inTransit: number;
    fulfilled: number;
    total: number;
  };
  travellers: {
    available: number;
    matched: number;
    departed: number;
    total: number;
  };
  volunteers: {
    idle: number;
    assigned: number;
    delivering: number;
    unavailable: number;
  };
  byCountry: Record<Country, {
    waiting: number;
    inTransit: number;
    fulfilled: number;
  }>;
  avgDeliveryTimeDays: number;
  wastedCapacityRate: number; 
  urgentFulfilled: number;     
  totalUrgentGenerated: number; 
}

export interface DaySnapshot {
  day: number;
  newRequests: DonationRequest[];
  newTravellers: Traveller[];
  matchesMade: MatchEvent[];
  dispatchResult: DispatchResult;
  arrivals: string[];        
  agentStates: AgentStateCounts;
  metrics: DailyMetrics;
}

export interface VisualizationData {
  algorithm: MatchingAlgorithm;
  config: SimulationConfig;
  seed: number;
  days: DaySnapshot[];
  totalDays: number;
}


const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];


function deriveDispatchSeed(algorithm: string, baseSeed: number): number {
  const str = `dispatch-${algorithm}-${baseSeed}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function runSnapshotSimulation(
  config: SimulationConfig,
  algorithm: MatchingAlgorithm,
  seed: number
): VisualizationData {
  const rng = new SeededRNG(seed);
  const dispatchRng = new SeededRNG(deriveDispatchSeed(algorithm, seed));

  const startMonthIndex = MONTH_NAMES.indexOf(config.startMonth);
  const monthName = MONTH_NAMES[startMonthIndex >= 0 ? startMonthIndex : 0];

  const matchFunction = getMatchFunction(algorithm);

  const allRequests: DonationRequest[] = [];
  const allTravellers: Traveller[] = [];
  const volunteers: Volunteer[] = generateVolunteerPool(rng, config.volunteersSingapore);

  const snapshots: DaySnapshot[] = [];
  let cumulativeFulfilled = 0;

  const TRANSIT_DAYS = 2;

  for (let day = 1; day <= config.simulationDays; day++) {
    const newRequests = generateDonationRequests(rng, day, monthName, config.requestsPerDay, config.urgencyScenario, config.urgentExpiryDays);
    const newTravellers = generateTravellers(rng, day, monthName, config.willingnessScenario, config.platformAdoptionRate);
    const snapshotNewRequests = newRequests.map(r => ({ ...r }));
    const snapshotNewTravellers = newTravellers.map(t => ({ ...t, assignedRequestIds: [...t.assignedRequestIds] }));

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

    const waitingBefore = new Set(
      allRequests.filter(r => r.state === "Waiting").map(r => r.id)
    );

    matchFunction(allRequests, allTravellers);

    const matchesMade: MatchEvent[] = [];
    for (const req of allRequests) {
      if (req.state === "Matched" && waitingBefore.has(req.id)) {
        matchesMade.push({
          requestId: req.id,
          travellerId: req.matchedTravellerId!,
          destination: req.destination,
          weightKg: req.weightKg,
          urgency: req.urgency,
        });
      }
    }

    const dispatchResult = dispatchVolunteers(dispatchRng, allRequests, allTravellers, volunteers, day);
    const arrivals: string[] = [];
    for (const request of allRequests) {
      if (
        request.state === "InTransit" &&
        request.matchedDay !== undefined &&
        day - request.matchedDay >= TRANSIT_DAYS
      ) {
        request.state = "Fulfilled";
        request.fulfilledDay = day;
        arrivals.push(request.id);
      }
    }
    const fulfilled = allRequests.filter(r => r.fulfilledDay === day).length;
    cumulativeFulfilled += fulfilled;

    const backlog = allRequests.filter(r => r.state === "Waiting").length;

    const byCountry = {} as DailyMetrics["byCountry"];
    for (const country of COUNTRIES) {
      const countryNewReqs = newRequests.filter(r => r.destination === country);
      const countryFulfilled = allRequests.filter(
        r => r.fulfilledDay === day && r.destination === country
      ).length;
      const countryBacklog = allRequests.filter(
        r => r.state === "Waiting" && r.destination === country
      ).length;
      const countryTravellersAvailable = newTravellers.filter(
        t => t.destination === country
      ).length;
      const countryTravellersMatched = allTravellers.filter(
        t =>
          t.state === "Matched" &&
          t.departureDay === day &&
          t.destination === country
      ).length + allTravellers.filter(
        t =>
          t.state === "Departed" &&
          t.departureDay === day &&
          t.destination === country &&
          t.assignedRequestIds.length > 0
      ).length;

      byCountry[country] = {
        newRequests: countryNewReqs.length,
        fulfilled: countryFulfilled,
        backlog: countryBacklog,
        travellersAvailable: countryTravellersAvailable,
        travellersMatched: countryTravellersMatched,
      };
    }

    const totalWeightToday = allRequests
      .filter(r => r.fulfilledDay === day)
      .reduce((sum, r) => sum + r.weightKg, 0);

    const expiredToday = allRequests.filter(r => r.state === "Expired" && r.expiryDay === day - 1).length;

    const metrics: DailyMetrics = {
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
    };

    const agentStates: AgentStateCounts = {
      requests: {
        waiting: allRequests.filter(r => r.state === "Waiting").length,
        matched: allRequests.filter(r => r.state === "Matched").length,
        inTransit: allRequests.filter(r => r.state === "InTransit").length,
        fulfilled: allRequests.filter(r => r.state === "Fulfilled").length,
        total: allRequests.length,
      },
      travellers: {
        available: allTravellers.filter(t => t.state === "Available").length,
        matched: allTravellers.filter(t => t.state === "Matched").length,
        departed: allTravellers.filter(t => t.state === "Departed").length,
        total: allTravellers.length,
      },
      volunteers: {
        idle: volunteers.filter(v => v.state === "Idle").length,
        assigned: volunteers.filter(v => v.state === "Assigned").length,
        delivering: volunteers.filter(v => v.state === "Delivering").length,
        unavailable: volunteers.filter(v => v.state === "Unavailable").length,
      },
      byCountry: {} as AgentStateCounts["byCountry"],
      avgDeliveryTimeDays: 0,
      wastedCapacityRate: 0,
      urgentFulfilled: 0,
      totalUrgentGenerated: 0,
    };

    for (const country of COUNTRIES) {
      agentStates.byCountry[country] = {
        waiting: allRequests.filter(r => r.state === "Waiting" && r.destination === country).length,
        inTransit: allRequests.filter(r => r.state === "InTransit" && r.destination === country).length,
        fulfilled: allRequests.filter(r => r.state === "Fulfilled" && r.destination === country).length,
      };
    }

    const fulfilledReqs = allRequests.filter(r => r.state === "Fulfilled" && r.fulfilledDay !== undefined);
    agentStates.avgDeliveryTimeDays = fulfilledReqs.length > 0
      ? Math.round(fulfilledReqs.reduce((sum, r) => sum + (r.fulfilledDay! - r.datePosted), 0) / fulfilledReqs.length * 10) / 10
      : 0;

    const totalDeparted = allTravellers.filter(t => t.state === "Departed").length;
    const departedEmpty = allTravellers.filter(t => t.state === "Departed" && t.assignedRequestIds.length === 0).length;
    agentStates.wastedCapacityRate = totalDeparted > 0
      ? Math.round((departedEmpty / totalDeparted) * 1000) / 1000
      : 0;

    agentStates.urgentFulfilled = allRequests.filter(r => r.urgency === "High" && r.state === "Fulfilled").length;
    agentStates.totalUrgentGenerated = allRequests.filter(r => r.urgency === "High").length;

    snapshots.push({
      day,
      newRequests: snapshotNewRequests,
      newTravellers: snapshotNewTravellers,
      matchesMade,
      dispatchResult,
      arrivals,
      agentStates,
      metrics,
    });
  }

  return {
    algorithm,
    config,
    seed,
    days: snapshots,
    totalDays: config.simulationDays,
  };
}
