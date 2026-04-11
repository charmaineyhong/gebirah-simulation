"use strict";
/**
 * Matching Algorithm Index
 *
 * Exports all 3 matching algorithms with a common interface so the
 * simulation engine can easily swap between them.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchWeightOptimised = exports.matchPriority = exports.matchFIFO = void 0;
exports.getMatchFunction = getMatchFunction;
const fifo_1 = require("./fifo");
Object.defineProperty(exports, "matchFIFO", { enumerable: true, get: function () { return fifo_1.matchFIFO; } });
const priority_1 = require("./priority");
Object.defineProperty(exports, "matchPriority", { enumerable: true, get: function () { return priority_1.matchPriority; } });
const weightOptimised_1 = require("./weightOptimised");
Object.defineProperty(exports, "matchWeightOptimised", { enumerable: true, get: function () { return weightOptimised_1.matchWeightOptimised; } });
const MATCH_FUNCTIONS = {
    fifo: fifo_1.matchFIFO,
    priority: priority_1.matchPriority,
    weightOptimised: weightOptimised_1.matchWeightOptimised,
};
function getMatchFunction(algorithm) {
    return MATCH_FUNCTIONS[algorithm];
}
