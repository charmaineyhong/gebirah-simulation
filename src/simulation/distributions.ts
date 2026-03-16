/**
 * Probability Distribution Functions
 *
 * These are the mathematical "dice" the simulation uses to generate
 * random but realistic data. Each distribution models a different
 * real-world phenomenon:
 *
 * - Poisson:     How many donation requests arrive per day (random count)
 * - Gamma:       How much personal luggage a traveller carries (random weight)
 * - Bernoulli:   Yes/no decisions (is a traveller willing? does a volunteer show up?)
 * - Categorical: Pick one destination country based on weighted probabilities
 * - Uniform:     Pick a random number in a range (e.g., request weight 1-15kg)
 *
 * All functions use a seeded random number generator (SeededRNG) so that
 * results are reproducible - same seed = same results every time.
 * This is essential for the controlled experiment (Section 4.7.5 of report).
 */

// ============================================================
// SEEDED RANDOM NUMBER GENERATOR
// Uses the Mulberry32 algorithm - a simple, fast PRNG
// Same seed always produces the same sequence of numbers
// ============================================================

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a random number between 0 and 1 (like Math.random() but seeded) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// ============================================================
// POISSON DISTRIBUTION
// Models: "How many events happen in a time period?"
// Used for: Donation request arrivals per day
//
// Example: If lambda=10 (avg 10 requests/day), on any given day
// you might get 7, 10, 12, etc. - it varies randomly around 10.
// ============================================================

export function samplePoisson(rng: SeededRNG, lambda: number): number {
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
// Models: "How much does something weigh?" (continuous, positive values)
// Used for: Personal luggage weight (mean=15.9kg, shape=5.0)
//
// The shape parameter controls how "spread out" the distribution is.
// With shape=5 and mean=15.9kg, most values fall between 8-25kg.
// ============================================================

export function sampleGamma(rng: SeededRNG, shape: number, scale: number): number {
  // Marsaglia and Tsang's method for generating Gamma-distributed numbers
  if (shape < 1) {
    // For shape < 1, use the relation: Gamma(a) = Gamma(a+1) * U^(1/a)
    return sampleGamma(rng, shape + 1, scale) * Math.pow(rng.next(), 1.0 / shape);
  }

  const d = shape - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);

  while (true) {
    let x: number;
    let v: number;

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
function sampleStandardNormal(rng: SeededRNG): number {
  const u1 = rng.next();
  const u2 = rng.next();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// ============================================================
// BERNOULLI DISTRIBUTION
// Models: "Does this event happen or not?" (coin flip with custom probability)
// Used for:
//   - Is a traveller willing to carry donations? (p = 0.03/0.06/0.10)
//   - Does a volunteer show up? (p = 0.70-0.95)
//
// Returns true with probability p, false with probability (1-p)
// ============================================================

export function sampleBernoulli(rng: SeededRNG, p: number): boolean {
  return rng.next() < p;
}

// ============================================================
// CATEGORICAL DISTRIBUTION
// Models: "Pick one option from a list, where each option has a different chance"
// Used for:
//   - Picking which country a donation request is for (HDI weights)
//   - Picking which country a traveller is flying to (CAAS weights)
//   - Picking urgency level (High 20%, Medium 50%, Low 30%)
//
// Example: If weights are {Myanmar: 0.35, Cambodia: 0.25, ...}
// then Myanmar gets picked 35% of the time.
// ============================================================

export function sampleCategorical<T extends string>(
  rng: SeededRNG,
  weights: Record<T, number>
): T {
  const entries = Object.entries(weights) as [T, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + (w as number), 0);
  let r = rng.next() * totalWeight;

  for (const [category, weight] of entries) {
    r -= weight as number;
    if (r <= 0) {
      return category;
    }
  }

  // Fallback (should not happen with valid weights)
  return entries[entries.length - 1][0];
}

// ============================================================
// UNIFORM DISTRIBUTION
// Models: "Pick a random number between min and max"
// Used for:
//   - Request weight (1-15kg, uniform random)
//   - Volunteer reliability (0.70-0.95)
//   - Flight departure hour
// ============================================================

/** Returns a random integer between min and max (inclusive) */
export function sampleUniformInt(rng: SeededRNG, min: number, max: number): number {
  return Math.floor(rng.next() * (max - min + 1)) + min;
}

/** Returns a random float between min and max */
export function sampleUniformFloat(rng: SeededRNG, min: number, max: number): number {
  return rng.next() * (max - min) + min;
}

// ============================================================
// FLIGHT DEPARTURE HOUR
// Models realistic Changi Airport flight schedule
// Flights from 06:00-23:00 with morning (07-10) and evening (17-21) peaks
// Peak hours have 2x the probability of off-peak hours
// ============================================================

export function sampleDepartureHour(rng: SeededRNG): number {
  // Build weighted hours: peak hours get weight 2, off-peak get weight 1
  const hours: Record<string, number> = {};
  for (let h = 6; h <= 23; h++) {
    const isPeak = (h >= 7 && h <= 10) || (h >= 17 && h <= 21);
    hours[String(h)] = isPeak ? 2.0 : 1.0;
  }
  return parseInt(sampleCategorical(rng, hours));
}
