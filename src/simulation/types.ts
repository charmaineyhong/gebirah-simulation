/**
 * Type Definitions for the Gebirah Agent-Based Simulation
 *
 * These types define the 3 agent types (Donation Request, Traveller, Volunteer)
 * and their state machines, exactly as described in Section 4.7.1 and 4.7.2
 * of the midterms report.
 */

import type { Country, UrgencyLevel, MatchingAlgorithm, WillingnessScenario } from "../config/constants";

// ============================================================
// AGENT 1: DONATION REQUEST
// State machine: Waiting → Matched → InTransit → Fulfilled
// (Can go back to Waiting on volunteer no-show)
// ============================================================

export type DonationRequestState = "Waiting" | "Matched" | "InTransit" | "Fulfilled" | "Expired";

export interface DonationRequest {
  id: string;
  destination: Country;
  weightKg: number;           // 1-15kg, how heavy the donated goods are
  urgency: UrgencyLevel;      // High, Medium, or Low
  datePosted: number;         // simulation day when the request was created
  state: DonationRequestState;
  matchedTravellerId?: string; // which traveller is carrying this
  matchedDay?: number;         // simulation day when matched
  fulfilledDay?: number;       // simulation day when delivered
}

// ============================================================
// AGENT 2: TRAVELLER
// State machine: Available → Matched → Departed
// (Departed can be "with donations" or "wasted capacity")
// ============================================================

export type TravellerState = "Available" | "Matched" | "Departed";

export interface Traveller {
  id: string;
  destination: Country;
  departureDay: number;       // simulation day when the flight departs
  departureHour: number;      // hour of departure (6-23)
  spareCapacityKg: number;    // how much extra space they have (IATA_MAX - personal - buffer)
  state: TravellerState;
  assignedRequestIds: string[]; // which donation requests they're carrying
  usedCapacityKg: number;      // how much of their spare capacity is used
}

// ============================================================
// AGENT 3: VOLUNTEER
// State machine: Idle → Assigned → Delivering → Idle (cyclical)
// Or: Assigned → Unavailable (on no-show)
// ============================================================

export type VolunteerState = "Idle" | "Assigned" | "Delivering" | "Unavailable";

export interface Volunteer {
  id: string;
  location: Country | "Singapore"; // where the volunteer is based
  reliability: number;       // 0.70-0.95, probability of showing up
  state: VolunteerState;
  assignedTravellerId?: string; // which traveller they're helping
}

// ============================================================
// DAILY METRICS (recorded at the end of each simulated day)
// ============================================================

export interface DailyMetrics {
  day: number;
  newRequests: number;
  requestsFulfilledToday: number;
  cumulativeFulfilled: number;
  backlogSize: number;        // requests still in Waiting state
  travellersAvailable: number;
  travellersMatched: number;
  travellersDepartedEmpty: number; // wasted capacity
  totalWeightDeliveredToday: number;
  volunteerNoShows: number;
  byCountry: Record<Country, {
    newRequests: number;
    fulfilled: number;
    backlog: number;
    travellersAvailable: number;
    travellersMatched: number;
  }>;
}

// ============================================================
// SIMULATION RESULTS (output of one complete simulation run)
// ============================================================

export interface SummaryMetrics {
  algorithm: MatchingAlgorithm;
  totalRequestsGenerated: number;
  totalRequestsFulfilled: number;
  totalRequestsUnfulfilled: number;
  fulfillmentRate: number;          // % fulfilled
  avgDeliveryTimeDays: number;      // average days from posted to fulfilled
  urgentFulfillmentRate: number;    // % of HIGH urgency requests fulfilled
  totalWeightDeliveredKg: number;
  avgBacklogSize: number;
  wastedCapacityRate: number;       // % of travellers who departed empty
  avgCapacityUtilisation: number;   // % of spare capacity used when matched
  byCountry: Record<Country, {
    totalRequests: number;
    fulfilled: number;
    unfulfilled: number;
    fulfillmentRate: number;
    avgDeliveryTimeDays: number;
  }>;
}

export interface SimulationRunResult {
  runId: number;
  seed: number;
  algorithm: MatchingAlgorithm;
  summary: SummaryMetrics;
  dailyMetrics: DailyMetrics[];
}

// ============================================================
// EXPERIMENT RESULTS (multiple runs averaged together)
// ============================================================

export interface ExperimentResult {
  algorithm: MatchingAlgorithm;
  willingnessScenario: WillingnessScenario;
  numRuns: number;
  avgSummary: SummaryMetrics;
  confidenceIntervals: {
    fulfillmentRate: { lower: number; upper: number };
    avgDeliveryTimeDays: { lower: number; upper: number };
    urgentFulfillmentRate: { lower: number; upper: number };
    wastedCapacityRate: { lower: number; upper: number };
  };
  allRuns: SimulationRunResult[];
  avgDailyMetrics: DailyMetrics[];
}

// ============================================================
// SIMULATION CONFIGURATION (what the user sets before running)
// ============================================================

export interface SimulationConfig {
  willingnessScenario: WillingnessScenario;
  platformAdoptionRate: number; // what % of willing travellers actually use the platform
  numRuns: number;
  simulationDays: number;
  startMonth: string; // for seasonal factor lookup
}

// ============================================================
// FULL OUTPUT (one JSON file per willingness scenario)
// ============================================================

export interface ScenarioOutput {
  scenario: WillingnessScenario;
  willingnessRate: number;
  config: SimulationConfig;
  results: ExperimentResult[];
  generatedAt: string;
}
