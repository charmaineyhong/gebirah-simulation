"use strict";
/**
 * Agent Generators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDonationRequests = generateDonationRequests;
exports.generateTravellers = generateTravellers;
exports.generateVolunteerPool = generateVolunteerPool;
const constants_1 = require("../config/constants");
const distributions_1 = require("./distributions");
// GENERATE DONATION REQUESTS
function generateDonationRequests(rng, day, month, requestsPerDay = constants_1.REQUESTS_PER_DAY, urgencyScenario = "normal", urgentExpiryDays = 5) {
    const seasonalFactor = constants_1.SEASONAL_FACTORS[month] ?? 1.0;
    const adjustedLambda = requestsPerDay * seasonalFactor;
    const numRequests = (0, distributions_1.samplePoisson)(rng, adjustedLambda);
    const urgencyDistribution = constants_1.URGENCY_SCENARIOS[urgencyScenario];
    const requests = [];
    for (let i = 0; i < numRequests; i++) {
        const destination = (0, distributions_1.sampleCategorical)(rng, constants_1.HDI_REQUEST_WEIGHTS);
        const weightKg = Math.round((0, distributions_1.sampleUniformFloat)(rng, constants_1.REQUEST_WEIGHT_MIN_KG, constants_1.REQUEST_WEIGHT_MAX_KG) * 10) / 10;
        const urgency = (0, distributions_1.sampleCategorical)(rng, urgencyDistribution);
        const expiryDay = urgency === "High" ? day + urgentExpiryDays : undefined;
        requests.push({
            id: `req-d${day}-${i}`,
            destination: destination,
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
function generateTravellers(rng, day, month, willingnessScenario, platformAdoptionRate) {
    const seasonalFactor = constants_1.SEASONAL_FACTORS[month] ?? 1.0;
    const willingnessRate = constants_1.WILLINGNESS_SCENARIOS[willingnessScenario];
    const totalDepartures = Math.round(constants_1.DAILY_TARGET_DEPARTURES * seasonalFactor);
    const travellers = [];
    let travellerIndex = 0;
    for (const country of constants_1.COUNTRIES) {
        const countryWeight = constants_1.CAAS_DESTINATION_WEIGHTS[country];
        const countryDepartures = Math.round(totalDepartures * countryWeight);
        const effectiveRate = willingnessRate * platformAdoptionRate;
        const expectedOnPlatform = countryDepartures * effectiveRate;
        const numOnPlatform = (0, distributions_1.samplePoisson)(rng, expectedOnPlatform);
        for (let i = 0; i < numOnPlatform; i++) {
            const personalLuggage = (0, distributions_1.sampleGamma)(rng, constants_1.GAMMA_SHAPE, constants_1.GAMMA_SCALE);
            const spareCapacity = Math.max(0, constants_1.IATA_MAX_BAGGAGE_KG - personalLuggage - constants_1.SAFETY_BUFFER_KG);
            if (spareCapacity < 0.5)
                continue;
            const departureHour = (0, distributions_1.sampleDepartureHour)(rng);
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
function generateVolunteerPool(rng, volunteersSingapore = constants_1.VOLUNTEERS_SINGAPORE) {
    const volunteers = [];
    let index = 0;
    for (let i = 0; i < volunteersSingapore; i++) {
        volunteers.push({
            id: `vol-sg-${index}`,
            location: "Singapore",
            reliability: Math.round((0, distributions_1.sampleUniformFloat)(rng, constants_1.VOLUNTEER_RELIABILITY_MIN, constants_1.VOLUNTEER_RELIABILITY_MAX) * 100) / 100,
            state: "Idle",
        });
        index++;
    }
    for (const country of constants_1.COUNTRIES) {
        for (let i = 0; i < constants_1.VOLUNTEERS_PER_DESTINATION; i++) {
            volunteers.push({
                id: `vol-${country.toLowerCase().slice(0, 3)}-${index}`,
                location: country,
                reliability: Math.round((0, distributions_1.sampleUniformFloat)(rng, constants_1.VOLUNTEER_RELIABILITY_MIN, constants_1.VOLUNTEER_RELIABILITY_MAX) * 100) / 100,
                state: "Idle",
            });
            index++;
        }
    }
    return volunteers;
}
