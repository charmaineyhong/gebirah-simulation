/**
 * Agent Generators
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
  URGENCY_SCENARIOS,
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
  type UrgencyScenario,
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


// GENERATE DONATION REQUESTS


export function generateDonationRequests(
  rng: SeededRNG,
  day: number,
  month: string,
  requestsPerDay: number = REQUESTS_PER_DAY,
  urgencyScenario: UrgencyScenario = "normal",
  urgentExpiryDays: number = 5
): DonationRequest[] {

  const seasonalFactor = SEASONAL_FACTORS[month] ?? 1.0;
  const adjustedLambda = requestsPerDay * seasonalFactor;
  const numRequests = samplePoisson(rng, adjustedLambda);

  const urgencyDistribution = URGENCY_SCENARIOS[urgencyScenario];
  const requests: DonationRequest[] = [];

  for (let i = 0; i < numRequests; i++) {
  
    const destination = sampleCategorical(rng, HDI_REQUEST_WEIGHTS);

    const weightKg = Math.round(
      sampleUniformFloat(rng, REQUEST_WEIGHT_MIN_KG, REQUEST_WEIGHT_MAX_KG) * 10
    ) / 10;

    const urgency = sampleCategorical(rng, urgencyDistribution) as UrgencyLevel;

    const expiryDay = urgency === "High" ? day + urgentExpiryDays : undefined;

    requests.push({
      id: `req-d${day}-${i}`,
      destination: destination as Country,
      weightKg,
      urgency,
      datePosted: day,
      state: "Waiting",
      expiryDay,
    });
  }

  return requests;
}


// GENERATE TRAVELLERS

export function generateTravellers(
  rng: SeededRNG,
  day: number,
  month: string,
  willingnessScenario: WillingnessScenario,
  platformAdoptionRate: number
): Traveller[] {
  const seasonalFactor = SEASONAL_FACTORS[month] ?? 1.0;
  const willingnessRate = WILLINGNESS_SCENARIOS[willingnessScenario];

  const totalDepartures = Math.round(DAILY_TARGET_DEPARTURES * seasonalFactor);

  const travellers: Traveller[] = [];
  let travellerIndex = 0;

  for (const country of COUNTRIES) {
    const countryWeight = CAAS_DESTINATION_WEIGHTS[country];
    const countryDepartures = Math.round(totalDepartures * countryWeight);
    const effectiveRate = willingnessRate * platformAdoptionRate;
    const expectedOnPlatform = countryDepartures * effectiveRate;
    const numOnPlatform = samplePoisson(rng, expectedOnPlatform);

    for (let i = 0; i < numOnPlatform; i++) {
      const personalLuggage = sampleGamma(rng, GAMMA_SHAPE, GAMMA_SCALE);
      const spareCapacity = Math.max(
        0,
        IATA_MAX_BAGGAGE_KG - personalLuggage - SAFETY_BUFFER_KG
      );
      if (spareCapacity < 0.5) continue;

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


// GENERATE VOLUNTEER POOL

export function generateVolunteerPool(rng: SeededRNG, volunteersSingapore: number = VOLUNTEERS_SINGAPORE): Volunteer[] {
  const volunteers: Volunteer[] = [];
  let index = 0;

  for (let i = 0; i < volunteersSingapore; i++) {
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
