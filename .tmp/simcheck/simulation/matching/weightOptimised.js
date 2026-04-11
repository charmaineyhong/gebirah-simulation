"use strict";
/**
 * Weight-Optimised Matching Algorithm (0/1 Knapsack)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchWeightOptimised = matchWeightOptimised;
function matchWeightOptimised(requests, travellers) {
    // Get all available travellers
    const availableTravellers = travellers.filter((t) => t.state === "Available");
    for (const traveller of availableTravellers) {
        const capacity = traveller.spareCapacityKg - traveller.usedCapacityKg;
        if (capacity < 1)
            continue;
        // Get waiting requests for this traveller's destination
        const candidateRequests = requests.filter((r) => r.state === "Waiting" && r.destination === traveller.destination);
        if (candidateRequests.length === 0)
            continue;
        // Solve the knapsack problem:
        // "Which combination of requests fills this traveller's capacity best?"
        const selectedIndices = solveKnapsack(candidateRequests, capacity);
        // Match the selected requests
        for (const idx of selectedIndices) {
            const request = candidateRequests[idx];
            request.state = "Matched";
            request.matchedTravellerId = traveller.id;
            traveller.assignedRequestIds.push(request.id);
            traveller.usedCapacityKg += request.weightKg;
            traveller.state = "Matched";
        }
    }
}
/**
 * 0/1 Knapsack via dynamic programming
 *
 * We discretise weights to 0.1kg precision (multiply by 10) to use
 * integer DP. This gives us exact solutions efficiently.
 *
 * For very large candidate sets (>50), we limit to the top 50 by weight
 * to keep computation fast.
 */
function solveKnapsack(items, capacity) {
    // Limit candidate set for performance
    let candidates = items;
    if (candidates.length > 50) {
        candidates = [...items]
            .sort((a, b) => b.weightKg - a.weightKg)
            .slice(0, 50);
    }
    const n = candidates.length;
    // Discretise: convert kg to decigrams (0.1kg units)
    const cap = Math.floor(capacity * 10);
    // dp[i] = maximum total weight achievable with capacity i
    const dp = new Float64Array(cap + 1);
    // track which items were selected (for backtracking)
    const selected = Array.from({ length: n }, () => new Array(cap + 1).fill(false));
    for (let i = 0; i < n; i++) {
        const w = Math.round(candidates[i].weightKg * 10);
        // Traverse backwards so each item is only used once (0/1 knapsack)
        for (let c = cap; c >= w; c--) {
            const withItem = dp[c - w] + candidates[i].weightKg;
            if (withItem > dp[c]) {
                dp[c] = withItem;
                selected[i][c] = true;
            }
        }
    }
    // Backtrack to find which items were selected
    const result = [];
    let remainingCap = cap;
    for (let i = n - 1; i >= 0; i--) {
        if (selected[i][remainingCap]) {
            result.push(i);
            remainingCap -= Math.round(candidates[i].weightKg * 10);
        }
    }
    // Map back to original indices if we limited candidates
    if (items.length > 50) {
        const sortedItems = [...items].sort((a, b) => b.weightKg - a.weightKg);
        return result.map((idx) => items.indexOf(sortedItems[idx]));
    }
    return result;
}
