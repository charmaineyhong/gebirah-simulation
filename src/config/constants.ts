/**
 * Simulation Constants
 *
 * All numbers in this file come from two sources:
 * 1. Oral Report 1 - 60.008 Systems Design Studio
 * 2. Real data fetched from data.gov.sg (CAAS air passenger statistics)
 *
 * See the /data folder for the scripts that fetched and preprocessed the data.
 */

// ============================================================
// TARGET COUNTRIES
// ============================================================

export const COUNTRIES = [
  "Myanmar",
  "Cambodia",
  "Indonesia",
  "Philippines",
  "Vietnam",
] as const;

export type Country = (typeof COUNTRIES)[number];

// ============================================================
// HDI-BASED REQUEST WEIGHTS (Table 3 in report)
// Higher HDI deficit = more humanitarian need = more donation requests
// ============================================================

export const HDI_REQUEST_WEIGHTS: Record<Country, number> = {
  Myanmar: 0.35,
  Cambodia: 0.25,
  Indonesia: 0.2,
  Philippines: 0.15,
  Vietnam: 0.05,
};

// ============================================================
// CAAS DESTINATION WEIGHTS (from data.gov.sg - Dataset d_ba460709b5b56388bf8a5bcba84e0bfb)
// These determine where travellers are flying to
// Based on 2024 actual air passenger departure data
//
// Indonesia:   3,603,194 passengers → 54.0%
// Philippines: 1,511,701 passengers → 22.7%
// Vietnam:     1,155,207 passengers → 17.3%
// Cambodia:      250,000 passengers →  3.8% (estimated from "Other SEA")
// Myanmar:       150,000 passengers →  2.2% (estimated from "Other SEA")
// ============================================================

export const CAAS_DESTINATION_WEIGHTS: Record<Country, number> = {
  Indonesia: 0.5402,
  Philippines: 0.2266,
  Vietnam: 0.1732,
  Cambodia: 0.0375,
  Myanmar: 0.0225,
};

// ============================================================
// TRAVELLER DATA (from data.gov.sg - Dataset d_90089b064caf754498b794466996c4c8)
// ============================================================

/** Total annual air departures from Singapore in 2024 */
export const TOTAL_ANNUAL_DEPARTURES = 8_839_546;

/** Average daily departures from Changi Airport */
export const DAILY_DEPARTURES = Math.round(TOTAL_ANNUAL_DEPARTURES / 365); // ~24,218

/** Daily departures to our 5 target countries only */
export const DAILY_TARGET_DEPARTURES = Math.round(
  (6_670_102 / TOTAL_ANNUAL_DEPARTURES) * DAILY_DEPARTURES
); // ~18,274

// ============================================================
// SEASONAL FACTORS (from data.gov.sg - Dataset d_98e2567a033e812081b78aabe250fc13)
// Monthly adjustment to traveller arrival rates
// Factor > 1.0 = peak season (more travellers)
// Factor < 1.0 = off-peak (fewer travellers)
// ============================================================

export const SEASONAL_FACTORS: Record<string, number> = {
  Jan: 0.914,
  Feb: 0.907,
  Mar: 0.967,
  Apr: 0.987,
  May: 0.963,
  Jun: 1.056,
  Jul: 1.073,
  Aug: 1.035,
  Sep: 0.942,
  Oct: 1.003,
  Nov: 1.023,
  Dec: 1.129,
};

// ============================================================
// WILLINGNESS SCENARIOS (Section 3.2 of report)
// Probability that a traveller is willing to carry donations
// Based on CAF World Giving Index adjusted for Singapore
// ============================================================

export const WILLINGNESS_SCENARIOS = {
  conservative: 0.03,
  likely: 0.06,
  optimistic: 0.1,
} as const;

export type WillingnessScenario = keyof typeof WILLINGNESS_SCENARIOS;

// ============================================================
// PLATFORM ADOPTION RATE
// What fraction of willing travellers actually discover, register on,
// and use the Gebirah platform for a specific trip.
//
// Since Gebirah has not yet launched, this rate is unknown.
// We treat it as a tunable parameter and test values from 0.1% to 1.0%
// to explore how adoption affects system performance.
//
// Default: 0.5% (0.005)
// This means: 18,274 daily departures × 6% willing × 0.5% platform
//           = ~5.5 travellers/day entering the system (likely scenario)
// ============================================================

export const DEFAULT_OPERATIONAL_REACH_RATE = 0.01;

// ============================================================
// DONATION REQUEST PARAMETERS (Section 4.7.3 of report)
// ============================================================

/** Average donation requests per day across all 5 countries */
export const REQUESTS_PER_DAY = 15;

/** Poisson lambda per hour (REQUESTS_PER_DAY / 24) */
export const POISSON_LAMBDA_PER_HOUR = REQUESTS_PER_DAY / 24;

/** Request weight range in kg */
export const REQUEST_WEIGHT_MIN_KG = 1;
export const REQUEST_WEIGHT_MAX_KG = 15;

/** Urgency distribution */
export const URGENCY_DISTRIBUTION = {
  High: 0.2,
  Medium: 0.5,
  Low: 0.3,
} as const;

export type UrgencyLevel = keyof typeof URGENCY_DISTRIBUTION;

// ============================================================
// BAGGAGE / LUGGAGE PARAMETERS (Section 3.2 of report)
// ============================================================

/** IATA maximum checked baggage allowance in kg */
export const IATA_MAX_BAGGAGE_KG = 32;

/** Safety buffer in kg (conservative margin) */
export const SAFETY_BUFFER_KG = 2;

/**
 * Personal luggage weight follows a Gamma distribution
 * Mean = 15.9 kg (from Changi Airport data)
 * Shape (k) = 5.0
 * Scale (θ) = mean / shape = 3.18
 *
 * Spare capacity = IATA_MAX - personal_luggage - SAFETY_BUFFER
 */
export const GAMMA_SHAPE = 5.0;
export const GAMMA_SCALE = 15.9 / GAMMA_SHAPE; // 3.18

// ============================================================
// VOLUNTEER PARAMETERS (Section 4.7.2 of report)
// ============================================================

/** Volunteer reliability range (Bernoulli probability of showing up) */
export const VOLUNTEER_RELIABILITY_MIN = 0.7;
export const VOLUNTEER_RELIABILITY_MAX = 0.95;

/** Volunteer pool sizes (Gebirah is a small startup with limited volunteers) */
export const VOLUNTEERS_SINGAPORE = 5;
export const VOLUNTEERS_PER_DESTINATION = 3;

// ============================================================
// SIMULATION PARAMETERS
// ============================================================

/** Number of simulated days per run */
export const SIMULATION_DAYS = 30;

/** Default number of runs per algorithm per experiment */
export const DEFAULT_NUM_RUNS = 20;

/** The 3 matching algorithms being compared */
export const MATCHING_ALGORITHMS = ["fifo", "priority", "weightOptimised"] as const;

export type MatchingAlgorithm = (typeof MATCHING_ALGORITHMS)[number];

// ============================================================
// FLIGHT DEPARTURE TIME DISTRIBUTION
// Modeled from typical Changi Airport schedule
// Flights operate 06:00-23:00 with morning and evening peaks
// ============================================================

export const FLIGHT_HOURS = {
  start: 6, // 06:00
  end: 23, // 23:00
  morningPeakStart: 7,
  morningPeakEnd: 10,
  eveningPeakStart: 17,
  eveningPeakEnd: 21,
  peakWeight: 2.0, // peak hours have 2x the flights of off-peak
};
