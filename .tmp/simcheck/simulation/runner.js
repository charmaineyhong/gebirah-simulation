"use strict";
/**
 * Experiment Runner
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExperiment = runExperiment;
const constants_1 = require("../config/constants");
const engine_1 = require("./engine");
function runExperiment(scenario, startMonth = "Jun", platformAdoptionRate = 0.01, onProgress, requestsPerDay = 15, volunteersSingapore = 5, urgencyScenario = "normal", urgentExpiryDays = 5) {
    const config = {
        willingnessScenario: scenario,
        platformAdoptionRate,
        numRuns: constants_1.NUM_RUNS,
        simulationDays: constants_1.SIMULATION_DAYS,
        startMonth,
        requestsPerDay,
        volunteersSingapore,
        urgencyScenario,
        urgentExpiryDays,
    };
    const totalSteps = constants_1.MATCHING_ALGORITHMS.length * constants_1.NUM_RUNS;
    let completedSteps = 0;
    const results = [];
    for (const algorithm of constants_1.MATCHING_ALGORITHMS) {
        const runs = [];
        for (let run = 0; run < constants_1.NUM_RUNS; run++) {
            const seed = hashSeed(run);
            onProgress?.({
                currentAlgorithm: algorithm,
                currentRun: run + 1,
                totalRuns: constants_1.NUM_RUNS,
                percentComplete: Math.round((completedSteps / totalSteps) * 100),
            });
            const result = (0, engine_1.runSimulation)(config, algorithm, seed, run);
            runs.push(result);
            completedSteps++;
        }
        const experimentResult = aggregateRuns(algorithm, scenario, runs);
        results.push(experimentResult);
    }
    onProgress?.({
        currentAlgorithm: "weightOptimised",
        currentRun: constants_1.NUM_RUNS,
        totalRuns: constants_1.NUM_RUNS,
        percentComplete: 100,
    });
    return {
        scenario,
        willingnessRate: constants_1.WILLINGNESS_SCENARIOS[scenario],
        config,
        results,
        generatedAt: new Date().toISOString(),
    };
}
// AGGREGATE RUNS
function aggregateRuns(algorithm, scenario, runs) {
    const NUM_RUNS = runs.length;
    // Average summary metrics across all runs
    const avgSummary = averageSummaries(algorithm, runs.map((r) => r.summary));
    // Compute 95% confidence intervals for key metrics
    const confidenceIntervals = computeConfidenceIntervals(runs.map((r) => r.summary));
    // Average daily metrics across all runs
    const avgDailyMetrics = averageDailyMetrics(runs.map((r) => r.dailyMetrics));
    return {
        algorithm,
        willingnessScenario: scenario,
        numRuns: NUM_RUNS,
        avgSummary,
        confidenceIntervals,
        allRuns: runs,
        avgDailyMetrics,
    };
}
// AVERAGE SUMMARIES
function averageSummaries(algorithm, summaries) {
    const n = summaries.length;
    const avg = (field) => summaries.reduce((sum, s) => sum + field(s), 0) / n;
    const countries = Object.keys(summaries[0].byCountry);
    const byCountry = {};
    for (const country of countries) {
        byCountry[country] = {
            totalRequests: Math.round(avg((s) => s.byCountry[country].totalRequests)),
            fulfilled: Math.round(avg((s) => s.byCountry[country].fulfilled)),
            unfulfilled: Math.round(avg((s) => s.byCountry[country].unfulfilled)),
            expired: Math.round(avg((s) => s.byCountry[country].expired)),
            fulfillmentRate: Math.round(avg((s) => s.byCountry[country].fulfillmentRate) * 10000) / 10000,
            avgDeliveryTimeDays: Math.round(avg((s) => s.byCountry[country].avgDeliveryTimeDays) * 10) / 10,
        };
    }
    return {
        algorithm,
        totalRequestsGenerated: Math.round(avg((s) => s.totalRequestsGenerated)),
        totalRequestsFulfilled: Math.round(avg((s) => s.totalRequestsFulfilled)),
        totalRequestsUnfulfilled: Math.round(avg((s) => s.totalRequestsUnfulfilled)),
        totalExpired: Math.round(avg((s) => s.totalExpired)),
        fulfillmentRate: Math.round(avg((s) => s.fulfillmentRate) * 10000) / 10000,
        avgDeliveryTimeDays: Math.round(avg((s) => s.avgDeliveryTimeDays) * 10) / 10,
        urgentFulfillmentRate: Math.round(avg((s) => s.urgentFulfillmentRate) * 10000) / 10000,
        totalWeightDeliveredKg: Math.round(avg((s) => s.totalWeightDeliveredKg) * 10) / 10,
        avgBacklogSize: Math.round(avg((s) => s.avgBacklogSize) * 10) / 10,
        wastedCapacityRate: Math.round(avg((s) => s.wastedCapacityRate) * 10000) / 10000,
        avgCapacityUtilisation: Math.round(avg((s) => s.avgCapacityUtilisation) * 10000) / 10000,
        maxWaitTime: Math.round(avg((s) => s.maxWaitTime) * 10) / 10,
        requestsWaitingOver20Days: Math.round(avg((s) => s.requestsWaitingOver20Days)),
        byCountry,
    };
}
// CONFIDENCE INTERVALS
function computeConfidenceIntervals(summaries) {
    return {
        fulfillmentRate: computeCI(summaries.map((s) => s.fulfillmentRate)),
        avgDeliveryTimeDays: computeCI(summaries.map((s) => s.avgDeliveryTimeDays)),
        urgentFulfillmentRate: computeCI(summaries.map((s) => s.urgentFulfillmentRate)),
        wastedCapacityRate: computeCI(summaries.map((s) => s.wastedCapacityRate)),
    };
}
function computeCI(values) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const margin = 1.96 * (stdDev / Math.sqrt(n)); // 95% CI
    return {
        lower: Math.round((mean - margin) * 10000) / 10000,
        upper: Math.round((mean + margin) * 10000) / 10000,
    };
}
// AVERAGE DAILY METRICS
function averageDailyMetrics(allRuns) {
    if (allRuns.length === 0)
        return [];
    const numDays = allRuns[0].length;
    const NUM_RUNS = allRuns.length;
    const result = [];
    for (let d = 0; d < numDays; d++) {
        const dayMetrics = allRuns.map((run) => run[d]);
        const countries = Object.keys(dayMetrics[0].byCountry);
        const byCountry = {};
        for (const country of countries) {
            byCountry[country] = {
                newRequests: Math.round(dayMetrics.reduce((s, m) => s + m.byCountry[country].newRequests, 0) / NUM_RUNS),
                fulfilled: Math.round(dayMetrics.reduce((s, m) => s + m.byCountry[country].fulfilled, 0) / NUM_RUNS),
                backlog: Math.round(dayMetrics.reduce((s, m) => s + m.byCountry[country].backlog, 0) / NUM_RUNS),
                travellersAvailable: Math.round(dayMetrics.reduce((s, m) => s + m.byCountry[country].travellersAvailable, 0) / NUM_RUNS),
                travellersMatched: Math.round(dayMetrics.reduce((s, m) => s + m.byCountry[country].travellersMatched, 0) / NUM_RUNS),
            };
        }
        result.push({
            day: d + 1,
            newRequests: Math.round(dayMetrics.reduce((s, m) => s + m.newRequests, 0) / NUM_RUNS),
            requestsFulfilledToday: Math.round(dayMetrics.reduce((s, m) => s + m.requestsFulfilledToday, 0) / NUM_RUNS),
            requestsExpiredToday: Math.round(dayMetrics.reduce((s, m) => s + m.requestsExpiredToday, 0) / NUM_RUNS),
            cumulativeFulfilled: Math.round(dayMetrics.reduce((s, m) => s + m.cumulativeFulfilled, 0) / NUM_RUNS),
            backlogSize: Math.round(dayMetrics.reduce((s, m) => s + m.backlogSize, 0) / NUM_RUNS),
            travellersAvailable: Math.round(dayMetrics.reduce((s, m) => s + m.travellersAvailable, 0) / NUM_RUNS),
            travellersMatched: Math.round(dayMetrics.reduce((s, m) => s + m.travellersMatched, 0) / NUM_RUNS),
            travellersDepartedEmpty: Math.round(dayMetrics.reduce((s, m) => s + m.travellersDepartedEmpty, 0) / NUM_RUNS),
            totalWeightDeliveredToday: Math.round((dayMetrics.reduce((s, m) => s + m.totalWeightDeliveredToday, 0) / NUM_RUNS) * 10) / 10,
            volunteerNoShows: Math.round(dayMetrics.reduce((s, m) => s + m.volunteerNoShows, 0) / NUM_RUNS),
            byCountry,
        });
    }
    return result;
}
// SEED HASHING
function hashSeed(runIndex) {
    let hash = 0;
    const str = `run${runIndex}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash);
}
