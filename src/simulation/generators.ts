/**
 * Agent Generators
 *
 * These functions create new agents (Donation Requests, Travellers, Volunteers)
 * at the start of each simulated day.
 *
 * - Donation requests arrive via a Poisson process, split across countries
 *   using HDI weights (Myanmar gets the most requests because it has the
 *   highest humanitarian need).
 *
 * - Travellers are generated starting from Changi Airport departure data:
 *   24,218 daily departures → filter to 5 target countries (18,274)
 *   → filter by willingness (3%/6%/10%) → filter by platform adoption
 *   → assign spare baggage capacity via Gamma distribution.
 *
 * - Volunteers are generated once at the start of the simulation as a
 *   fixed pool, then recycled (Idle → Assigned → Delivering → Idle).
 */

import {
  COUNTRIES,
  HDI_REQUEST_WEIGHTS,
  CAAS_DESTINATION_WEIGHTS,
  DAILY_TARGET_DEPARTURES,
  SEASONAL_FACTORS,
  REQUESTS_PER_DAY,
  REQUEST_WEIGHT_MIN_KG,
  REQUEST_WEIGHT_MAX_KG,
  URGENCY_DISTRIBUTION,
  IATA_MAX_BAGGAGE_KG,
  SAFETY_BUFFER_KG,
  GAMMA_SHAPE,
  GAMMA_SCALE,
  VOLUNTEER_RELIABILITY_MIN,
  VOLUNTEER_RELIABILITY_MAX,
  VOLUNTEERS_SINGAPORE,
  VOLUNTEERS_PER_DESTINATION,
  type Country,
  type UrgencyLevel,
  type WillingnessScenario,
  WILLINGNESS_SCENARIOS,
} from "../config/constants";

import {
  SeededRNG,
  samplePoisson,
  sampleGamma,
  sampleCategorical,
  sampleUniformFloat,
  sampleDepartureHour,
} from "./distributions";

import type { DonationRequest, Traveller, Volunteer } from "./types";

// ============================================================
// GENERATE DONATION REQUESTS
// "How many people need help today, and where?"
// ============================================================

export function generateDonationRequests(
  rng: SeededRNG,
  day: number,
  month: string
): DonationRequest[] {
  // Step 1: How many requests arrive today?
  // Use Poisson distribution with seasonal adjustment
  const seasonalFactor = SEASONAL_FACTORS[month] ?? 1.0;
  const adjustedLambda = REQUESTS_PER_DAY * seasonalFactor;
  const numRequests = samplePoisson(rng, adjustedLambda);

  const requests: DonationRequest[] = [];

  for (let i = 0; i < numRequests; i++) {
    // Step 2: Which country is this request for?
    // Use HDI weights - Myanmar (highest need) gets 35% of requests
    const destination = sampleCategorical(rng, HDI_REQUEST_WEIGHTS);

    // Step 3: How heavy is the donation?
    // Random weight between 1-15kg
    const weightKg = Math.round(
      sampleUniformFloat(rng, REQUEST_WEIGHT_MIN_KG, REQUEST_WEIGHT_MAX_KG) * 10
    ) / 10;

    // Step 4: How urgent is it?
    // High (20%), Medium (50%), Low (30%)
    const urgency = sampleCategorical(rng, URGENCY_DISTRIBUTION);

    requests.push({
      id: `req-d${day}-${i}`,
      destination: destination as Country,
      weightKg,
      urgency: urgency as UrgencyLevel,
      datePosted: day,
      state: "Waiting",
    });
  }

  return requests;
}

// ============================================================
// GENERATE TRAVELLERS
// "How many travellers on the Gebirah platform depart from Changi today?"
//
// The funnel (all starting from Singapore):
//   24,218 daily departures from Changi (CAAS 2024 data)
//   → 18,274 going to our 5 target countries (CAAS country data)
//   → × willingness rate (3%/6%/10% from CAF World Giving Index)
//   → × platform adoption rate (tunable, default 0.5%)
//   → = travellers who actually enter the system
//
// Example (likely scenario, 6% willing, 0.5% platform):
//   Indonesia: 9,872/day × 6% × 0.5% = ~3.0 travellers/day
//   Philippines: 4,142/day × 6% × 0.5% = ~1.2 travellers/day
//   Vietnam: 3,165/day × 6% × 0.5% = ~0.9 travellers/day
//   Cambodia: 685/day × 6% × 0.5% = ~0.2 travellers/day
//   Myanmar: 411/day × 6% × 0.5% = ~0.1 travellers/day
//   Total: ~5.5 travellers/day
// ============================================================

export function generateTravellers(
  rng: SeededRNG,
  day: number,
  month: string,
  willingnessScenario: WillingnessScenario,
  platformAdoptionRate: number
): Traveller[] {
  const seasonalFactor = SEASONAL_FACTORS[month] ?? 1.0;
  const willingnessRate = WILLINGNESS_SCENARIOS[willingnessScenario];

  // Step 1: How many travellers depart to target countries today?
  // Start with ~18,274/day from Changi, adjust for seasonal factor
  const totalDepartures = Math.round(DAILY_TARGET_DEPARTURES * seasonalFactor);

  // Step 2: For each destination country, apply the full funnel
  const travellers: Traveller[] = [];
  let travellerIndex = 0;

  for (const country of COUNTRIES) {
    const countryWeight = CAAS_DESTINATION_WEIGHTS[country];
    const countryDepartures = Math.round(totalDepartures * countryWeight);

    // Step 3: Apply willingness × platform adoption
    // Combined rate = willingness × platform adoption
    // Use Poisson approximation for the expected count
    const effectiveRate = willingnessRate * platformAdoptionRate;
    const expectedOnPlatform = countryDepartures * effectiveRate;
    const numOnPlatform = samplePoisson(rng, expectedOnPlatform);

    for (let i = 0; i < numOnPlatform; i++) {
      // Step 4: Calculate spare baggage capacity
      // Personal luggage ~ Gamma(shape=5, scale=3.18), mean=15.9kg
      const personalLuggage = sampleGamma(rng, GAMMA_SHAPE, GAMMA_SCALE);

      // Spare capacity = IATA max (32kg) - personal luggage - 2kg buffer
      const spareCapacity = Math.max(
        0,
        IATA_MAX_BAGGAGE_KG - personalLuggage - SAFETY_BUFFER_KG
      );

      // Only include travellers with meaningful spare capacity (>0.5kg)
      if (spareCapacity < 0.5) continue;

      // Step 5: Assign a departure hour
      const departureHour = sampleDepartureHour(rng);

      travellers.push({
        id: `trav-d${day}-${travellerIndex}`,
        destination: country,
        departureDay: day,
        departureHour,
        spareCapacityKg: Math.round(spareCapacity * 10) / 10,
        state: "Available",
        assignedRequestIds: [],
        usedCapacityKg: 0,
      });

      travellerIndex++;
    }
  }

  return travellers;
}

// ============================================================
// GENERATE VOLUNTEER POOL
// "How many volunteers are available at each location?"
//
// Gebirah is a small startup with limited volunteer capacity.
// Singapore (Changi side): 5 volunteers for handover
// Each destination: 3 volunteers for receiving
// Total: 5 + (5 × 3) = 20 volunteers
//
// Volunteers are created once at the start of the simulation,
// then recycled (Idle → Assigned → Delivering → Idle).
// ============================================================

export function generateVolunteerPool(rng: SeededRNG): Volunteer[] {
  const volunteers: Volunteer[] = [];
  let index = 0;

  // Create volunteers in Singapore (Changi Airport side)
  for (let i = 0; i < VOLUNTEERS_SINGAPORE; i++) {
    volunteers.push({
      id: `vol-sg-${index}`,
      location: "Singapore",
      reliability: Math.round(
        sampleUniformFloat(rng, VOLUNTEER_RELIABILITY_MIN, VOLUNTEER_RELIABILITY_MAX) * 100
      ) / 100,
      state: "Idle",
    });
    index++;
  }

  // Create volunteers at each destination country
  for (const country of COUNTRIES) {
    for (let i = 0; i < VOLUNTEERS_PER_DESTINATION; i++) {
      volunteers.push({
        id: `vol-${country.toLowerCase().slice(0, 3)}-${index}`,
        location: country,
        reliability: Math.round(
          sampleUniformFloat(rng, VOLUNTEER_RELIABILITY_MIN, VOLUNTEER_RELIABILITY_MAX) * 100
        ) / 100,
        state: "Idle",
      });
      index++;
    }
  }

  return volunteers;
}
