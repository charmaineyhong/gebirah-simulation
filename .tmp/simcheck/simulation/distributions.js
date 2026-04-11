"use strict";
/**
 * Probability Distribution Functions
 *
 * - Poisson:     How many donation requests arrive per day (random count)
 * - Gamma:       How much personal luggage a traveller carries (random weight)
 * - Bernoulli:   Yes/no decisions (is a traveller willing? does a volunteer show up?)
 * - Categorical: Pick one destination country based on weighted probabilities
 * - Uniform:     Pick a random number in a range (e.g., request weight 1-15kg)
 *
 * All functions use a seeded random number generator (SeededRNG) so that
 * results are reproducible - same seed = same results every time.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRNG = void 0;
exports.samplePoisson = samplePoisson;
exports.sampleGamma = sampleGamma;
exports.sampleBernoulli = sampleBernoulli;
exports.sampleCategorical = sampleCategorical;
exports.sampleUniformInt = sampleUniformInt;
exports.sampleUniformFloat = sampleUniformFloat;
exports.sampleDepartureHour = sampleDepartureHour;
// ============================================================
// SEEDED RANDOM NUMBER GENERATOR
// Uses the Mulberry32 algorithm - a simple, fast PRNG
// Same seed always produces the same sequence of numbers
// ============================================================
class SeededRNG {
    state;
    constructor(seed) {
        this.state = seed;
    }
    /** Returns a random number between 0 and 1 (like Math.random() but seeded) */
    next() {
        this.state |= 0;
        this.state = (this.state + 0x6d2b79f5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}
exports.SeededRNG = SeededRNG;
// ============================================================
// POISSON DISTRIBUTION
// ============================================================
function samplePoisson(rng, lambda) {
    // Knuth's algorithm for generating Poisson-distributed random numbers
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1.0;
    do {
        k++;
        p *= rng.next();
    } while (p > L);
    return k - 1;
}
// ============================================================
// GAMMA DISTRIBUTION
// ============================================================
function sampleGamma(rng, shape, scale) {
    // Marsaglia and Tsang's method for generating Gamma-distributed numbers
    if (shape < 1) {
        // For shape < 1, use the relation: Gamma(a) = Gamma(a+1) * U^(1/a)
        return sampleGamma(rng, shape + 1, scale) * Math.pow(rng.next(), 1.0 / shape);
    }
    const d = shape - 1.0 / 3.0;
    const c = 1.0 / Math.sqrt(9.0 * d);
    while (true) {
        let x;
        let v;
        do {
            // Generate a standard normal using Box-Muller transform
            x = sampleStandardNormal(rng);
            v = 1.0 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = rng.next();
        // Acceptance condition
        if (u < 1.0 - 0.0331 * (x * x) * (x * x)) {
            return d * v * scale;
        }
        if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) {
            return d * v * scale;
        }
    }
}
/** Helper: Generate a standard normal (mean=0, std=1) using Box-Muller */
function sampleStandardNormal(rng) {
    const u1 = rng.next();
    const u2 = rng.next();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}
// ============================================================
// BERNOULLI DISTRIBUTION
// ============================================================
function sampleBernoulli(rng, p) {
    return rng.next() < p;
}
// ============================================================
// CATEGORICAL DISTRIBUTION
// ============================================================
function sampleCategorical(rng, weights) {
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = rng.next() * totalWeight;
    for (const [category, weight] of entries) {
        r -= weight;
        if (r <= 0) {
            return category;
        }
    }
    // Fallback (should not happen with valid weights)
    return entries[entries.length - 1][0];
}
// ============================================================
// UNIFORM DISTRIBUTION
// ============================================================
/** Returns a random integer between min and max (inclusive) */
function sampleUniformInt(rng, min, max) {
    return Math.floor(rng.next() * (max - min + 1)) + min;
}
/** Returns a random float between min and max */
function sampleUniformFloat(rng, min, max) {
    return rng.next() * (max - min) + min;
}
// ============================================================
// FLIGHT DEPARTURE HOUR
// Models realistic Changi Airport flight schedule
// Flights from 06:00-23:00 with morning (07-10) and evening (17-21) peaks
// Peak hours have 2x the probability of off-peak hours
// ============================================================
function sampleDepartureHour(rng) {
    // Build weighted hours: peak hours get weight 2, off-peak get weight 1
    const hours = {};
    for (let h = 6; h <= 23; h++) {
        const isPeak = (h >= 7 && h <= 10) || (h >= 17 && h <= 21);
        hours[String(h)] = isPeak ? 2.0 : 1.0;
    }
    return parseInt(sampleCategorical(rng, hours));
}
