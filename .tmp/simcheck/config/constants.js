"use strict";
/**Simulation Constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLIGHT_HOURS = exports.MATCHING_ALGORITHMS = exports.NUM_RUNS = exports.SIMULATION_DAYS = exports.VOLUNTEERS_PER_DESTINATION = exports.VOLUNTEERS_SINGAPORE = exports.VOLUNTEER_RELIABILITY_MAX = exports.VOLUNTEER_RELIABILITY_MIN = exports.GAMMA_SCALE = exports.GAMMA_SHAPE = exports.SAFETY_BUFFER_KG = exports.IATA_MAX_BAGGAGE_KG = exports.DEFAULT_EXPIRY_DAYS = exports.URGENCY_SCENARIOS = exports.REQUEST_WEIGHT_MAX_KG = exports.REQUEST_WEIGHT_MIN_KG = exports.POISSON_LAMBDA_PER_HOUR = exports.REQUESTS_PER_DAY = exports.DEFAULT_OPERATIONAL_REACH_RATE = exports.WILLINGNESS_SCENARIOS = exports.SEASONAL_FACTORS = exports.DAILY_TARGET_DEPARTURES = exports.DAILY_DEPARTURES = exports.TOTAL_ANNUAL_DEPARTURES = exports.CAAS_DESTINATION_WEIGHTS = exports.HDI_REQUEST_WEIGHTS = exports.COUNTRIES = void 0;
// TARGET COUNTRIES
exports.COUNTRIES = [
    "Myanmar",
    "Cambodia",
    "Indonesia",
    "Philippines",
    "Vietnam",
];
// HDI-BASED REQUEST WEIGHTS Higher HDI deficit = more humanitarian need = more donation requests
exports.HDI_REQUEST_WEIGHTS = {
    Myanmar: 0.35,
    Cambodia: 0.25,
    Indonesia: 0.2,
    Philippines: 0.15,
    Vietnam: 0.05,
};
// CAAS DESTINATION WEIGHTS (from data.gov.sg - Dataset d_ba460709b5b56388bf8a5bcba84e0bfb)
exports.CAAS_DESTINATION_WEIGHTS = {
    Indonesia: 0.5402,
    Philippines: 0.2266,
    Vietnam: 0.1732,
    Cambodia: 0.0375,
    Myanmar: 0.0225,
};
// TRAVELLER DATA 
/** Total annual air departures from Singapore in 2024 */
exports.TOTAL_ANNUAL_DEPARTURES = 8_839_546;
/** Average daily departures from Changi Airport */
exports.DAILY_DEPARTURES = Math.round(exports.TOTAL_ANNUAL_DEPARTURES / 365);
/** Daily departures to our 5 target countries only */
exports.DAILY_TARGET_DEPARTURES = Math.round((6_670_102 / exports.TOTAL_ANNUAL_DEPARTURES) * exports.DAILY_DEPARTURES);
// SEASONAL FACTORS (from data.gov.sg - Dataset d_98e2567a033e812081b78aabe250fc13)
exports.SEASONAL_FACTORS = {
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
exports.WILLINGNESS_SCENARIOS = {
    conservative: 0.03,
    likely: 0.06,
    optimistic: 0.1,
};
// PLATFORM ADOPTION RATE
exports.DEFAULT_OPERATIONAL_REACH_RATE = 0.01;
// DONATION REQUEST PARAMETERS
/** Average donation requests per day across all 5 countries */
exports.REQUESTS_PER_DAY = 15;
/** Poisson lambda per hour (REQUESTS_PER_DAY / 24) */
exports.POISSON_LAMBDA_PER_HOUR = exports.REQUESTS_PER_DAY / 24;
/** Request weight range in kg */
exports.REQUEST_WEIGHT_MIN_KG = 1;
exports.REQUEST_WEIGHT_MAX_KG = 15;
// URGENCY SCENARIOS
exports.URGENCY_SCENARIOS = {
    normal: { High: 0, Low: 1 },
    someUrgent: { High: 0.1, Low: 0.9 },
    disasterResponse: { High: 0.4, Low: 0.6 },
};
/** Default number of days before a High urgency request expires */
exports.DEFAULT_EXPIRY_DAYS = 5;
// BAGGAGE / LUGGAGE PARAMETERS
/** IATA maximum checked baggage allowance in kg */
exports.IATA_MAX_BAGGAGE_KG = 32;
/** Safety buffer in kg (conservative margin) */
exports.SAFETY_BUFFER_KG = 2;
/**
 * Personal luggage weight follows a Gamma distribution
 */
exports.GAMMA_SHAPE = 5.0;
exports.GAMMA_SCALE = 15.9 / exports.GAMMA_SHAPE; // 3.18
// VOLUNTEER PARAMETERS 
/** Volunteer reliability range */
exports.VOLUNTEER_RELIABILITY_MIN = 0.7;
exports.VOLUNTEER_RELIABILITY_MAX = 0.95;
/** Volunteer pool sizes */
exports.VOLUNTEERS_SINGAPORE = 5;
exports.VOLUNTEERS_PER_DESTINATION = 3;
// SIMULATION PARAMETERS
/** Number of simulated days per run */
exports.SIMULATION_DAYS = 30;
/** Fixed number of Monte Carlo runs per algorithm */
exports.NUM_RUNS = 50;
/** The 3 matching algorithms being compared */
exports.MATCHING_ALGORITHMS = ["fifo", "priority", "weightOptimised"];
// FLIGHT DEPARTURE TIME DISTRIBUTION
exports.FLIGHT_HOURS = {
    start: 6,
    end: 23,
    morningPeakStart: 7,
    morningPeakEnd: 10,
    eveningPeakStart: 17,
    eveningPeakEnd: 21,
    peakWeight: 2.0, // peak hours have 2x the flights of off-peak
};
