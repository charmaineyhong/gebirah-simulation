/**
 * Step-Based Simulation Engine
 *
 * Unlike engine.ts which runs all 30 days at once, this engine
 * advances one day at a time, exposing full agent state after each step.
 * Used by the Live Simulation page for animated visualization.
 */

import { COUNTRIES, type MatchingAlgorithm } from "../config/constants";
import { SeededRNG } from "./distributions";
import {
  generateDonationRequests,
  generateTravellers,
  generateVolunteerPool,
} from "./generators";
import { getMatchFunction } from "./matching";
import { dispatchVolunteers } from "./volunteerDispatch";
import type {
  DonationRequest,
  Traveller,
  Volunteer,
  DailyMetrics,
  SimulationConfig,
} from "./types";

// ============================================================
// SIMULATION STATE — everything the UI needs to render
// ============================================================

export interface SimulationState {
  day: number;
  requests: DonationRequest[];
  travellers: Traveller[];
  volunteers: Volunteer[];
  dailyMetrics: DailyMetrics[];
  /** What happened this day — human-readable log entries */
  dayLog: string[];
  /** Is the simulation finished? */
  finished: boolean;
  /** Snapshot counts for the current day */
  todayStats: {
    newRequests: number;
    newTravellers: number;
    matched: number;
    fulfilled: number;
    expired: number;
    volunteerNoShows: number;
    inTransit: number;
    waiting: number;
  };
}

// ============================================================
// STEP ENGINE CLASS
// ============================================================

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const TRANSIT_DAYS = 2;

export class StepSimulation {
  private rng: SeededRNG;
  private config: SimulationConfig;
  private algorithm: MatchingAlgorithm;
  private matchFunction: ReturnType<typeof getMatchFunction>;

  private allRequests: DonationRequest[] = [];
  private allTravellers: Traveller[] = [];
  private volunteers: Volunteer[] = [];
  private dailyMetrics: DailyMetrics[] = [];
  private currentDay = 0;
  private cumulativeFulfilled = 0;
  private monthName: string;

  constructor(
    config: SimulationConfig,
    algorithm: MatchingAlgorithm,
    seed: number
  ) {
    this.config = config;
    this.algorithm = algorithm;
    this.rng = new SeededRNG(seed);
    this.matchFunction = getMatchFunction(algorithm);

    const startMonthIndex = MONTH_NAMES.indexOf(config.startMonth);
    this.monthName = MONTH_NAMES[startMonthIndex >= 0 ? startMonthIndex : 0];

    // Generate volunteer pool once
    this.volunteers = generateVolunteerPool(this.rng);
  }

  /** Get the current algorithm name */
  getAlgorithm(): MatchingAlgorithm {
    return this.algorithm;
  }

  /** Get current state snapshot (deep-ish copy for React) */
  getState(): SimulationState {
    return {
      day: this.currentDay,
      requests: this.allRequests.map((r) => ({ ...r })),
      travellers: this.allTravellers.map((t) => ({
        ...t,
        assignedRequestIds: [...t.assignedRequestIds],
      })),
      volunteers: this.volunteers.map((v) => ({ ...v })),
      dailyMetrics: [...this.dailyMetrics],
      dayLog: [],
      finished: this.currentDay >= this.config.simulationDays,
      todayStats: {
        newRequests: 0,
        newTravellers: 0,
        matched: 0,
        fulfilled: 0,
        expired: 0,
        volunteerNoShows: 0,
        inTransit: this.allRequests.filter((r) => r.state === "InTransit")
          .length,
        waiting: this.allRequests.filter((r) => r.state === "Waiting").length,
      },
    };
  }

  /** Advance the simulation by one day. Returns the new state. */
  stepDay(): SimulationState {
    if (this.currentDay >= this.config.simulationDays) {
      return this.getState();
    }

    this.currentDay++;
    const day = this.currentDay;
    const dayLog: string[] = [];

    // --- Step 1: Generate new agents ---
    const newRequests = generateDonationRequests(
      this.rng,
      day,
      this.monthName
    );
    const newTravellers = generateTravellers(
      this.rng,
      day,
      this.monthName,
      this.config.willingnessScenario,
      this.config.platformAdoptionRate
    );

    this.allRequests.push(...newRequests);
    this.allTravellers.push(...newTravellers);

    dayLog.push(
      `Day ${day}: ${newRequests.length} new requests, ${newTravellers.length} new travellers`
    );

    // Count requests by urgency
    const highCount = newRequests.filter((r) => r.urgency === "High").length;
    const medCount = newRequests.filter((r) => r.urgency === "Medium").length;
    const lowCount = newRequests.filter((r) => r.urgency === "Low").length;
    if (highCount > 0)
      dayLog.push(`  → ${highCount} HIGH urgency requests`);
    if (medCount > 0)
      dayLog.push(`  → ${medCount} MEDIUM urgency requests`);
    if (lowCount > 0)
      dayLog.push(`  → ${lowCount} LOW urgency requests`);

    // --- Step 2: Run matching ---
    const waitingBefore = this.allRequests.filter(
      (r) => r.state === "Waiting"
    ).length;
    this.matchFunction(this.allRequests, this.allTravellers);
    const waitingAfter = this.allRequests.filter(
      (r) => r.state === "Waiting"
    ).length;
    const matchedThisStep = waitingBefore - waitingAfter;

    if (matchedThisStep > 0) {
      dayLog.push(`  ✓ ${matchedThisStep} requests matched to travellers`);
    } else {
      dayLog.push(`  ✗ No matches possible today`);
    }

    // --- Step 3: Dispatch volunteers ---
    const dispatchResult = dispatchVolunteers(
      this.rng,
      this.allRequests,
      this.allTravellers,
      this.volunteers,
      day
    );

    if (dispatchResult.successfulHandovers > 0) {
      dayLog.push(
        `  ✓ ${dispatchResult.successfulHandovers} successful handovers`
      );
    }
    if (dispatchResult.volunteerNoShows > 0) {
      dayLog.push(
        `  ⚠ ${dispatchResult.volunteerNoShows} volunteer no-shows`
      );
    }

    // --- Step 4: Process arrivals ---
    let fulfilledToday = 0;
    for (const request of this.allRequests) {
      if (
        request.state === "InTransit" &&
        request.matchedDay !== undefined &&
        day - request.matchedDay >= TRANSIT_DAYS
      ) {
        request.state = "Fulfilled";
        request.fulfilledDay = day;
        fulfilledToday++;
      }
    }
    this.cumulativeFulfilled += fulfilledToday;

    if (fulfilledToday > 0) {
      dayLog.push(`  ★ ${fulfilledToday} donations delivered!`);
    }

    // --- Step 5: Record metrics ---
    const backlog = this.allRequests.filter(
      (r) => r.state === "Waiting"
    ).length;

    const byCountry = {} as DailyMetrics["byCountry"];
    for (const country of COUNTRIES) {
      const countryRequests = newRequests.filter(
        (r) => r.destination === country
      );
      const countryFulfilled = this.allRequests.filter(
        (r) => r.fulfilledDay === day && r.destination === country
      ).length;
      const countryBacklog = this.allRequests.filter(
        (r) => r.state === "Waiting" && r.destination === country
      ).length;
      const countryTravellersAvailable = newTravellers.filter(
        (t) => t.destination === country
      ).length;
      const countryTravellersMatched =
        this.allTravellers.filter(
          (t) =>
            t.state === "Matched" &&
            t.departureDay === day &&
            t.destination === country
        ).length +
        this.allTravellers.filter(
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

    const totalWeightToday = this.allRequests
      .filter((r) => r.fulfilledDay === day)
      .reduce((sum, r) => sum + r.weightKg, 0);

    const metrics: DailyMetrics = {
      day,
      newRequests: newRequests.length,
      requestsFulfilledToday: fulfilledToday,
      cumulativeFulfilled: this.cumulativeFulfilled,
      backlogSize: backlog,
      travellersAvailable: newTravellers.length,
      travellersMatched: dispatchResult.departedWithGoods.length,
      travellersDepartedEmpty: dispatchResult.departedEmpty.length,
      totalWeightDeliveredToday: Math.round(totalWeightToday * 10) / 10,
      volunteerNoShows: dispatchResult.volunteerNoShows,
      byCountry,
    };

    this.dailyMetrics.push(metrics);

    // Summary log
    dayLog.push(
      `  Backlog: ${backlog} | In transit: ${this.allRequests.filter((r) => r.state === "InTransit").length} | Total fulfilled: ${this.cumulativeFulfilled}`
    );

    const finished = this.currentDay >= this.config.simulationDays;
    if (finished) {
      const totalRequests = this.allRequests.length;
      const totalFulfilled = this.allRequests.filter(
        (r) => r.state === "Fulfilled"
      ).length;
      const rate = totalRequests > 0 ? (totalFulfilled / totalRequests) * 100 : 0;
      dayLog.push(
        `\n━━━ Simulation Complete ━━━\nFulfillment rate: ${rate.toFixed(1)}% (${totalFulfilled}/${totalRequests})`
      );
    }

    return {
      day: this.currentDay,
      requests: this.allRequests.map((r) => ({ ...r })),
      travellers: this.allTravellers.map((t) => ({
        ...t,
        assignedRequestIds: [...t.assignedRequestIds],
      })),
      volunteers: this.volunteers.map((v) => ({ ...v })),
      dailyMetrics: [...this.dailyMetrics],
      dayLog,
      finished,
      todayStats: {
        newRequests: newRequests.length,
        newTravellers: newTravellers.length,
        matched: matchedThisStep,
        fulfilled: fulfilledToday,
        expired: 0,
        volunteerNoShows: dispatchResult.volunteerNoShows,
        inTransit: this.allRequests.filter((r) => r.state === "InTransit")
          .length,
        waiting: backlog,
      },
    };
  }
}
