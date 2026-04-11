/**Simulation Constants
 */

// TARGET COUNTRIES
export const COUNTRIES = [
  "Myanmar",
  "Cambodia",
  "Indonesia",
  "Philippines",
  "Vietnam",
] as const;

export type Country = (typeof COUNTRIES)[number];

// HDI-BASED REQUEST WEIGHTS Higher HDI deficit = more humanitarian need = more donation requests

export const HDI_REQUEST_WEIGHTS: Record<Country, number> = {
  Myanmar: 0.35,
  Cambodia: 0.25,
  Indonesia: 0.2,
  Philippines: 0.15,
  Vietnam: 0.05,
};

// CAAS DESTINATION WEIGHTS (from data.gov.sg - Dataset d_ba460709b5b56388bf8a5bcba84e0bfb)


export const CAAS_DESTINATION_WEIGHTS: Record<Country, number> = {
  Indonesia: 0.5402,
  Philippines: 0.2266,
  Vietnam: 0.1732,
  Cambodia: 0.0375,
  Myanmar: 0.0225,
};


// TRAVELLER DATA 

/** Total annual air departures from Singapore in 2024 */
export const TOTAL_ANNUAL_DEPARTURES = 8_839_546;

/** Average daily departures from Changi Airport */
export const DAILY_DEPARTURES = Math.round(TOTAL_ANNUAL_DEPARTURES / 365); 

/** Daily departures to our 5 target countries only */
export const DAILY_TARGET_DEPARTURES = Math.round(
  (6_670_102 / TOTAL_ANNUAL_DEPARTURES) * DAILY_DEPARTURES
); 


// SEASONAL FACTORS (from data.gov.sg - Dataset d_98e2567a033e812081b78aabe250fc13)


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


// WILLINGNESS SCENARIOS 

export const WILLINGNESS_SCENARIOS = {
  conservative: 0.03,
  likely: 0.06,
  optimistic: 0.1,
} as const;

export type WillingnessScenario = keyof typeof WILLINGNESS_SCENARIOS;


// PLATFORM ADOPTION RATE


export const DEFAULT_OPERATIONAL_REACH_RATE = 0.01;


// DONATION REQUEST PARAMETERS


/** Average donation requests per day across all 5 countries */
export const REQUESTS_PER_DAY = 15;

/** Poisson lambda per hour (REQUESTS_PER_DAY / 24) */
export const POISSON_LAMBDA_PER_HOUR = REQUESTS_PER_DAY / 24;

/** Request weight range in kg */
export const REQUEST_WEIGHT_MIN_KG = 1;
export const REQUEST_WEIGHT_MAX_KG = 15;

export type UrgencyLevel = "High" | "Low";


// URGENCY SCENARIOS


export const URGENCY_SCENARIOS = {
  normal:           { High: 0,   Low: 1   },
  someUrgent:       { High: 0.1, Low: 0.9 },
  disasterResponse: { High: 0.4, Low: 0.6 },
} as const;

export type UrgencyScenario = keyof typeof URGENCY_SCENARIOS;

/** Default number of days before a High urgency request expires */
export const DEFAULT_EXPIRY_DAYS = 5;

// BAGGAGE / LUGGAGE PARAMETERS

/** IATA maximum checked baggage allowance in kg */
export const IATA_MAX_BAGGAGE_KG = 32;

/** Safety buffer in kg (conservative margin) */
export const SAFETY_BUFFER_KG = 2;

/**
 * Personal luggage weight follows a Gamma distribution
 */
export const GAMMA_SHAPE = 5.0;
export const GAMMA_SCALE = 15.9 / GAMMA_SHAPE; // 3.18

// VOLUNTEER PARAMETERS 


/** Volunteer reliability range */
export const VOLUNTEER_RELIABILITY_MIN = 0.7;
export const VOLUNTEER_RELIABILITY_MAX = 0.95;

/** Volunteer pool sizes */
export const VOLUNTEERS_SINGAPORE = 5;
export const VOLUNTEERS_PER_DESTINATION = 3;

// SIMULATION PARAMETERS


/** Number of simulated days per run */
export const SIMULATION_DAYS = 30;

/** Fixed number of Monte Carlo runs per algorithm */
export const NUM_RUNS = 50;

/** The 3 matching algorithms being compared */
export const MATCHING_ALGORITHMS = ["fifo", "priority", "weightOptimised"] as const;

export type MatchingAlgorithm = (typeof MATCHING_ALGORITHMS)[number];


// FLIGHT DEPARTURE TIME DISTRIBUTION


export const FLIGHT_HOURS = {
  start: 6, 
  end: 23, 
  morningPeakStart: 7,
  morningPeakEnd: 10,
  eveningPeakStart: 17,
  eveningPeakEnd: 21,
  peakWeight: 2.0, // peak hours have 2x the flights of off-peak
};
