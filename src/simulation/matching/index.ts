/**
 * Matching Algorithm Index
 *
 * Exports all 3 matching algorithms with a common interface so the
 * simulation engine can easily swap between them.
 */

import type { DonationRequest, Traveller } from "../types";
import type { MatchingAlgorithm } from "../../config/constants";
import { matchFIFO } from "./fifo";
import { matchPriority } from "./priority";
import { matchWeightOptimised } from "./weightOptimised";

export type MatchFunction = (
  requests: DonationRequest[],
  travellers: Traveller[]
) => void;

const MATCH_FUNCTIONS: Record<MatchingAlgorithm, MatchFunction> = {
  fifo: matchFIFO,
  priority: matchPriority,
  weightOptimised: matchWeightOptimised,
};

export function getMatchFunction(algorithm: MatchingAlgorithm): MatchFunction {
  return MATCH_FUNCTIONS[algorithm];
}

export { matchFIFO, matchPriority, matchWeightOptimised };
