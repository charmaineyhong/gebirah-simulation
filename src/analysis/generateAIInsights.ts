/**
 * AI-powered insight generation via OpenAI GPT-4o-mini
 */

import type { ScenarioOutput } from "../simulation/types";
import type { MatchingAlgorithm } from "../config/constants";
import type { Insight, InsightSeverity } from "./types";

const ALGORITHM_LABELS: Record<MatchingAlgorithm, string> = {
  fifo: "FIFO",
  priority: "Priority",
  weightOptimised: "Weight-Optimised",
};

const SYSTEM_PROMPT = `You are an expert analyst for a humanitarian logistics simulation called Gebirah. The simulation models using travellers' spare baggage capacity to deliver donations from Singapore to 5 Southeast Asian countries.

Key domain knowledge:
- Countries: Myanmar (MM), Cambodia (KH), Indonesia (ID), Philippines (PH), Vietnam (VN)
- HDI-based request weights (% of donation requests): Myanmar 35%, Cambodia 25%, Indonesia 20%, Philippines 15%, Vietnam 5%
- CAAS traveller destination weights (% of travellers): Indonesia 54%, Philippines 22.7%, Vietnam 17.3%, Cambodia 3.8%, Myanmar 2.2%
- This creates a structural mismatch: Myanmar/Cambodia have HIGH demand but VERY FEW travellers
- 3 matching algorithms are compared:
  - FIFO: First In, First Out (fairest baseline)
  - Priority: Urgent requests first, then by date (best for urgent fulfillment)
  - Weight-Optimised: 0/1 Knapsack to maximise kg per traveller (best for total weight delivered)
- Volunteers at Changi Airport perform handovers. Each has 70-95% reliability (Bernoulli). No-show = request re-queued
- Goods are in transit for 2 days before becoming "Fulfilled"

Your task: Analyze the simulation results and produce structured insights in TWO sections:

**Section 1 - Overall & Algorithm Insights (3-5 insights):** Explicitly compare the 3 algorithms (FIFO, Priority, Weight-Optimised). Evaluate their trade-offs in this scenario (e.g., highest fulfillment rate vs most urgent requests handled vs most weight delivered). Recommend the best algorithm for this specific configuration. Also cover supply/demand balance and volunteer impact. Use categories: "supply", "demand", "volunteers", "algorithm", or "overall".

**Section 2 - Country insights (1 insight per country that has notable findings):** For each country worth commenting on, provide a country-specific insight. You MUST recommend which algorithm benefits this specific country the most and explain WHY based on the data. Use category "country" and include the "country" field with the exact country name (Myanmar, Cambodia, Indonesia, Philippines, or Vietnam).

Focus on:
1. WHY metrics are high or low (root cause analysis)
2. Flagging anything unusual or out of the ordinary
3. Explaining country-level disparities using the HDI vs CAAS weight mismatch
4. Comparing algorithm performance explicitly per country, stating which algorithm is best suited for their specific supply/demand context.
5. Identifying bottlenecks (supply, volunteers, geographic mismatch)

Each insight must have:
- id: unique kebab-case identifier
- severity: "critical" (needs immediate attention), "warning" (notable concern), or "info" (useful context)
- category: "supply", "demand", "volunteers", "algorithm", "country", or "overall"
- country: (REQUIRED when category is "country") exact country name from: Myanmar, Cambodia, Indonesia, Philippines, Vietnam
- title: short headline (5-10 words) -- do NOT include the country name in the title for country insights
- explanation: 1-3 sentences explaining the insight with specific numbers

Respond with ONLY a JSON object: { "insights": [...] }`;

function buildUserPrompt(output: ScenarioOutput): string {
  const { config, results } = output;

  let prompt = `## Simulation Configuration
- Willingness scenario: ${config.willingnessScenario}
- Platform adoption (operational reach): ${(config.platformAdoptionRate * 100).toFixed(1)}%
- Donation requests per day: ${config.requestsPerDay}
- Volunteers at Changi: ${config.volunteersSingapore}
- Start month: ${config.startMonth}
- Simulation days: ${config.simulationDays}
- Monte Carlo runs: ${config.numRuns}

## Results by Algorithm\n\n`;

  for (const r of results) {
    const s = r.avgSummary;
    const ci = r.confidenceIntervals;
    prompt += `### ${ALGORITHM_LABELS[r.algorithm]}
- Fulfillment rate: ${(s.fulfillmentRate * 100).toFixed(1)}% (95% CI: ${(ci.fulfillmentRate.lower * 100).toFixed(1)}-${(ci.fulfillmentRate.upper * 100).toFixed(1)}%)
- Urgent fulfillment: ${(s.urgentFulfillmentRate * 100).toFixed(1)}% (CI: ${(ci.urgentFulfillmentRate.lower * 100).toFixed(1)}-${(ci.urgentFulfillmentRate.upper * 100).toFixed(1)}%)
- Avg delivery time: ${s.avgDeliveryTimeDays.toFixed(1)} days
- Total requests: ${s.totalRequestsGenerated}, Fulfilled: ${s.totalRequestsFulfilled}, Unfulfilled: ${s.totalRequestsUnfulfilled}
- Total weight delivered: ${s.totalWeightDeliveredKg.toFixed(0)} kg
- Avg backlog size: ${s.avgBacklogSize.toFixed(0)}
- Wasted capacity rate: ${(s.wastedCapacityRate * 100).toFixed(1)}%
- Capacity utilisation: ${(s.avgCapacityUtilisation * 100).toFixed(1)}%
- Country breakdown:\n`;

    for (const [country, data] of Object.entries(s.byCountry)) {
      prompt += `  - ${country}: ${data.totalRequests} requests, ${data.fulfilled} fulfilled (${(data.fulfillmentRate * 100).toFixed(1)}%), avg ${data.avgDeliveryTimeDays.toFixed(1)} days\n`;
    }
    prompt += "\n";
  }

  return prompt;
}

export async function generateAIInsights(output: ScenarioOutput): Promise<Insight[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_OPENAI_API_KEY is not set");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5",
      response_format: { type: "json_object" },
      // temperature: 0.3,
      // max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(output) },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI API");
  }

  const parsed = JSON.parse(content);
  const rawInsights = parsed.insights;

  if (!Array.isArray(rawInsights)) {
    throw new Error("Invalid response format: expected { insights: [...] }");
  }

  // Validate and sanitize each insight
  const validSeverities = new Set(["info", "warning", "critical"]);
  const validCategories = new Set(["supply", "demand", "volunteers", "algorithm", "country", "overall"]);

  const insights: Insight[] = rawInsights
    .filter(
      (i: Record<string, unknown>) =>
        typeof i.id === "string" &&
        typeof i.title === "string" &&
        typeof i.explanation === "string" &&
        validSeverities.has(i.severity as string) &&
        validCategories.has(i.category as string),
    )
    .map((i: Record<string, unknown>) => ({
      id: `ai-${i.id}`,
      severity: i.severity as InsightSeverity,
      category: i.category as Insight["category"],
      title: i.title as string,
      explanation: i.explanation as string,
      ...(typeof i.country === "string" ? { country: i.country } : {}),
    }));

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}
