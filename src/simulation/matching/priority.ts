/**
 * Priority-Based Matching Algorithm
 *
 * Like FIFO, but HIGH urgency requests jump to the front of the queue.
 * Within the same urgency level, older requests still go first.
 *
 * Priority order: High > Medium > Low, then oldest first within each level.
 *
 * Think of it like a hospital emergency room - the most critical patients
 * get seen first, but among equally critical patients, whoever arrived
 * first gets treated first.
 */

import type { DonationRequest, Traveller } from "../types";
import type { UrgencyLevel } from "../../config/constants";

const URGENCY_RANK: Record<UrgencyLevel, number> = {
  High: 0,   // highest priority (lowest number = first)
  Medium: 1,
  Low: 2,
};

export function matchPriority(
  requests: DonationRequest[],
  travellers: Traveller[]
): void {
  // Get all waiting requests, sorted by urgency first, then by date
  const waitingRequests = requests
    .filter((r) => r.state === "Waiting")
    .sort((a, b) => {
      // First compare urgency (High=0 comes before Medium=1 comes before Low=2)
      const urgencyDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      // Within same urgency, oldest first
      return a.datePosted - b.datePosted;
    });

  // Get all available travellers
  const availableTravellers = travellers.filter((t) => t.state === "Available");

  // For each traveller, fill their capacity with highest-priority requests first
  for (const traveller of availableTravellers) {
    const remainingCapacity =
      traveller.spareCapacityKg - traveller.usedCapacityKg;
    if (remainingCapacity < 1) continue;

    for (const request of waitingRequests) {
      if (request.state !== "Waiting") continue;
      if (request.destination !== traveller.destination) continue;

      const currentRemaining =
        traveller.spareCapacityKg - traveller.usedCapacityKg;
      if (request.weightKg > currentRemaining) continue;

      // Match!
      request.state = "Matched";
      request.matchedTravellerId = traveller.id;
      traveller.assignedRequestIds.push(request.id);
      traveller.usedCapacityKg += request.weightKg;
      traveller.state = "Matched";
    }
  }
}
