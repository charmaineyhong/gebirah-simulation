/**
 * AI-powered insights panel grouped into By Country then Overall
 */

import { useState, useEffect, useCallback } from "react";
import type { ScenarioOutput } from "../../simulation/types";
import type { Insight } from "../../analysis/types";
import { COUNTRIES } from "../../config/constants";
import { generateAIInsights } from "../../analysis/generateAIInsights";
import InsightCard from "./InsightCard";

interface Props {
  output: ScenarioOutput;
}

function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          defaultExpanded={insight.severity !== "info"}
        />
      ))}
    </div>
  );
}

function GroupedInsights({ insights }: { insights: Insight[] }) {
  const overall = insights.filter((i) => i.category !== "country");
  const countryInsights = insights.filter((i) => i.category === "country");

  // Group country insights by country name, maintaining COUNTRIES order
  const byCountry = new Map<string, Insight[]>();
  for (const country of COUNTRIES) {
    const matched = countryInsights.filter((i) => i.country === country);
    if (matched.length > 0) {
      byCountry.set(country, matched);
    }
  }
  // Catch any country insights that didn't match a known country name
  const unmatched = countryInsights.filter(
    (i) => !i.country || !COUNTRIES.includes(i.country as typeof COUNTRIES[number]),
  );
  if (unmatched.length > 0) {
    byCountry.set("Other", unmatched);
  }

  return (
    <div className="space-y-5">
      {/* By Country section first */}
      {byCountry.size > 0 && (
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500 mb-3">
            By Country
          </p>
          <div className="space-y-4">
            {Array.from(byCountry.entries()).map(([country, countryIns]) => (
              <div key={country}>
                <p className="text-xs font-semibold text-zinc-700 mb-1.5 ml-1">
                  {country}
                </p>
                <InsightList insights={countryIns} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall section second */}
      {overall.length > 0 && (
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            Overall
          </p>
          <InsightList insights={overall} />
        </div>
      )}

      {overall.length === 0 && byCountry.size === 0 && (
        <p className="text-xs text-zinc-500 font-mono py-4 text-center">
          No insights generated.
        </p>
      )}
    </div>
  );
}

export default function InsightsPanel({ output }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasApiKey = !!import.meta.env.VITE_OPENAI_API_KEY;

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateAIInsights(output);
      setInsights(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI insights");
    } finally {
      setLoading(false);
    }
  }, [output]);

  // Auto-trigger on mount (fires as soon as simulation results are ready)
  useEffect(() => {
    if (hasApiKey) {
      fetchInsights();
    }
  }, [hasApiKey, fetchInsights]);

  if (!hasApiKey) {
    return (
      <div className="panel p-5 text-center">
        <p className="section-label mb-2">AI Insights</p>
        <p className="text-xs text-zinc-500 font-mono">
          Set <code className="bg-inset px-1.5 py-0.5 rounded border border-edge">VITE_OPENAI_API_KEY</code> in your <code className="bg-inset px-1.5 py-0.5 rounded border border-edge">.env</code> file to enable AI-powered insights.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <p className="section-label">AI Insights</p>
        {!loading && insights.length > 0 && (
          <span className="text-[0.6rem] font-mono text-zinc-400">
            powered by GPT-4o-mini
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-mono">
            Analysing results with GPT-4o-mini...
          </span>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-xs text-red-600 font-mono mb-2">{error}</p>
          <button
            type="button"
            onClick={fetchInsights}
            className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-inset border border-edge rounded-lg hover:border-edge-strong transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <GroupedInsights insights={insights} />
      )}
    </div>
  );
}
