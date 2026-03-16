/**
 * FIFO (First In, First Out) Matching Algorithm
 *
 * The simplest algorithm: serve requests in the order they arrived.
 * Oldest requests get matched first. For each traveller, we keep
 * assigning the oldest waiting requests until their spare capacity
 * is full (or no more matching requests exist for that destination).
 *
 * Think of it like a queue at a counter - first person in line
 * gets served first, regardless of how urgent their need is.
 */

import type { DonationRequest, Traveller } from "../types";

export function matchFIFO(
  requests: DonationRequest[],
  travellers: Traveller[]
): void {
  // Get all waiting requests, sorted by datePosted (oldest first)
  const waitingRequests = requests
    .filter((r) => r.state === "Waiting")
    .sort((a, b) => a.datePosted - b.datePosted);

  // Get all available travellers
  const availableTravellers = travellers.filter((t) => t.state === "Available");

  // For each traveller, try to fill their spare capacity with requests
  for (const traveller of availableTravellers) {
    const remainingCapacity =
      traveller.spareCapacityKg - traveller.usedCapacityKg;
    if (remainingCapacity < 1) continue; // not enough space for any request

    // Find waiting requests going to the same destination
    for (const request of waitingRequests) {
      if (request.state !== "Waiting") continue; // already matched
      if (request.destination !== traveller.destination) continue; // wrong country

      // Check if the request fits in remaining capacity
      const currentRemaining =
        traveller.spareCapacityKg - traveller.usedCapacityKg;
      if (request.weightKg > currentRemaining) continue; // too heavy

      // Match! Assign this request to this traveller
      request.state = "Matched";
      request.matchedTravellerId = traveller.id;
      traveller.assignedRequestIds.push(request.id);
      traveller.usedCapacityKg += request.weightKg;
      traveller.state = "Matched";
    }
  }
}
