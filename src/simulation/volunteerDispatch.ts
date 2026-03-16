/**
 * Volunteer Dispatch
 *
 * After a traveller is matched with donation requests, we need a
 * volunteer to physically hand over the goods at the airport.
 *
 * This module handles:
 * 1. Finding an idle volunteer at the right location (Singapore side)
 * 2. Assigning the volunteer to the traveller
 * 3. Rolling the "reliability dice" (Bernoulli) to see if they show up
 * 4. If they show up → goods go to "In Transit" → eventually "Fulfilled"
 * 5. If they don't show up → request goes back to "Waiting" (re-queued)
 *
 * From the report (Section 4.7.2):
 * - Volunteer reliability ranges from 70% to 95%
 * - On no-show, requests are re-queued to the waiting pool
 */

import type { DonationRequest, Traveller, Volunteer } from "./types";
import { SeededRNG, sampleBernoulli } from "./distributions";

export interface DispatchResult {
  successfulHandovers: number;
  failedHandovers: number;
  volunteerNoShows: number;
  reQueuedRequests: string[];
  departedWithGoods: string[];  // traveller IDs that departed with donations
  departedEmpty: string[];       // traveller IDs that departed without donations
}

export function dispatchVolunteers(
  rng: SeededRNG,
  requests: DonationRequest[],
  travellers: Traveller[],
  volunteers: Volunteer[],
  currentDay: number
): DispatchResult {
  const result: DispatchResult = {
    successfulHandovers: 0,
    failedHandovers: 0,
    volunteerNoShows: 0,
    reQueuedRequests: [],
    departedWithGoods: [],
    departedEmpty: [],
  };

  // Find all matched travellers who are departing today
  const departingTravellers = travellers.filter(
    (t) => t.state === "Matched" && t.departureDay === currentDay
  );

  // Also handle available travellers departing today (they leave with nothing)
  const emptyDepartures = travellers.filter(
    (t) => t.state === "Available" && t.departureDay === currentDay
  );
  for (const traveller of emptyDepartures) {
    traveller.state = "Departed";
    result.departedEmpty.push(traveller.id);
  }

  // For each departing matched traveller, try to find a volunteer
  for (const traveller of departingTravellers) {
    // Find an idle volunteer in Singapore (handover happens at Changi)
    const availableVolunteer = volunteers.find(
      (v) => v.state === "Idle" && v.location === "Singapore"
    );

    if (!availableVolunteer) {
      // No volunteer available - traveller departs, requests re-queued
      handleNoVolunteer(traveller, requests, result);
      continue;
    }

    // Assign the volunteer
    availableVolunteer.state = "Assigned";
    availableVolunteer.assignedTravellerId = traveller.id;

    // Roll the reliability dice: does the volunteer show up?
    const showsUp = sampleBernoulli(rng, availableVolunteer.reliability);

    if (showsUp) {
      // Volunteer shows up! Handover is successful.
      handleSuccessfulHandover(
        traveller,
        requests,
        availableVolunteer,
        currentDay,
        result
      );
    } else {
      // Volunteer no-show — no backup, handover fails.
      // With only 5 volunteers in Singapore, each no-show hurts.
      // Requests go back to the waiting pool.
      availableVolunteer.state = "Unavailable";
      result.volunteerNoShows++;
      handleNoVolunteer(traveller, requests, result);
    }
  }

  // Reset unavailable volunteers back to idle at end of day
  for (const volunteer of volunteers) {
    if (volunteer.state === "Unavailable") {
      volunteer.state = "Idle";
      volunteer.assignedTravellerId = undefined;
    }
    if (volunteer.state === "Delivering") {
      volunteer.state = "Idle";
      volunteer.assignedTravellerId = undefined;
    }
  }

  return result;
}

/** Volunteer showed up → goods go to In Transit */
function handleSuccessfulHandover(
  traveller: Traveller,
  requests: DonationRequest[],
  volunteer: Volunteer,
  currentDay: number,
  result: DispatchResult
): void {
  // Move all matched requests to InTransit
  for (const reqId of traveller.assignedRequestIds) {
    const request = requests.find((r) => r.id === reqId);
    if (request) {
      request.state = "InTransit";
      request.matchedDay = currentDay;
    }
  }

  // Traveller departs with the goods
  traveller.state = "Departed";
  result.departedWithGoods.push(traveller.id);
  result.successfulHandovers++;

  // Volunteer transitions to Delivering
  volunteer.state = "Delivering";
}

/** No volunteer available or no-show → requests go back to Waiting */
function handleNoVolunteer(
  traveller: Traveller,
  requests: DonationRequest[],
  result: DispatchResult
): void {
  // Re-queue all assigned requests back to Waiting
  for (const reqId of traveller.assignedRequestIds) {
    const request = requests.find((r) => r.id === reqId);
    if (request) {
      request.state = "Waiting";
      request.matchedTravellerId = undefined;
      result.reQueuedRequests.push(reqId);
    }
  }

  // Traveller departs empty (wasted capacity)
  traveller.state = "Departed";
  traveller.assignedRequestIds = [];
  traveller.usedCapacityKg = 0;
  result.departedEmpty.push(traveller.id);
  result.failedHandovers++;
}
