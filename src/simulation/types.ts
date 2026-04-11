/**
 * Type Definitions for the Gebirah Agent-Based Simulation
 */

import type { Country, UrgencyLevel, MatchingAlgorithm, WillingnessScenario, UrgencyScenario } from "../config/constants";

// AGENT 1: DONATION REQUEST

export type DonationRequestState = "Waiting" | "Matched" | "InTransit" | "Fulfilled" | "Expired";

export interface DonationRequest {
  id: string;
  destination: Country;
  weightKg: number;          
  urgency: UrgencyLevel;      
  datePosted: number;        
  state: DonationRequestState;
  matchedTravellerId?: string; 
  matchedDay?: number;        
  fulfilledDay?: number;       
  expiryDay?: number;          
}

// AGENT 2: TRAVELLER

export type TravellerState = "Available" | "Matched" | "Departed";

export interface Traveller {
  id: string;
  destination: Country;
  departureDay: number;      
  departureHour: number;      
  spareCapacityKg: number;    
  state: TravellerState;
  assignedRequestIds: string[]; 
  usedCapacityKg: number;     
}

// AGENT 3: VOLUNTEER


export type VolunteerState = "Idle" | "Assigned" | "Delivering" | "Unavailable";

export interface Volunteer {
  id: string;
  location: Country | "Singapore";
  reliability: number;       
  state: VolunteerState;
  assignedTravellerId?: string; 
}

// DAILY METRICS (recorded at the end of each simulated day)


export interface DailyMetrics {
  day: number;
  newRequests: number;
  requestsFulfilledToday: number;
  requestsExpiredToday: number;   
  cumulativeFulfilled: number;
  backlogSize: number;        
  travellersAvailable: number;
  travellersMatched: number;
  travellersDepartedEmpty: number; 
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

// SIMULATION RESULTS (output of one complete simulation run)


export interface SummaryMetrics {
  algorithm: MatchingAlgorithm;
  totalRequestsGenerated: number;
  totalRequestsFulfilled: number;
  totalRequestsUnfulfilled: number; 
  totalExpired: number;             
  fulfillmentRate: number;          
  avgDeliveryTimeDays: number;      
  urgentFulfillmentRate: number;    
  totalWeightDeliveredKg: number;
  avgBacklogSize: number;
  wastedCapacityRate: number;      
  avgCapacityUtilisation: number;   
  maxWaitTime: number;              
  requestsWaitingOver20Days: number; 
  byCountry: Record<Country, {
    totalRequests: number;
    fulfilled: number;
    unfulfilled: number;
    expired: number;
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

// EXPERIMENT RESULTS (multiple runs averaged together)

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

// SIMULATION CONFIGURATION (what the user sets before running)

export interface SimulationConfig {
  willingnessScenario: WillingnessScenario;
  platformAdoptionRate: number; 
  numRuns: number;
  simulationDays: number;
  startMonth: string;
  requestsPerDay: number; 
  volunteersSingapore: number; 
  urgencyScenario: UrgencyScenario; 
  urgentExpiryDays: number;       
}

// FULL OUTPUT (one JSON file per willingness scenario)

export interface ScenarioOutput {
  scenario: WillingnessScenario;
  willingnessRate: number;
  config: SimulationConfig;
  results: ExperimentResult[];
  generatedAt: string;
}
