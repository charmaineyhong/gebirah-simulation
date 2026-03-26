/**
 * Results Page
 */

import type { ScenarioOutput } from "../simulation/types";
import FulfillmentChart from "../components/charts/FulfillmentChart";
import DailyTimeSeries from "../components/charts/DailyTimeSeries";
import CountryBreakdown from "../components/charts/CountryBreakdown";
import SummaryTable from "../components/tables/SummaryTable";
import CountryTable from "../components/tables/CountryTable";

interface Props {
  output: ScenarioOutput;
}

const SCENARIO_LABELS: Record<string, string> = {
  conservative: "Conservative 3%",
  likely: "Likely 6%",
  optimistic: "Optimistic 10%",
};

export default function Results({ output }: Props) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(output, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gebirah_${output.scenario}_results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="section-label mb-2">Results</p>
            <div className="flex flex-wrap items-center gap-2">
              {[
                SCENARIO_LABELS[output.scenario],
                `${(output.config.platformAdoptionRate * 100).toFixed(1)}% reach`,
                `${output.config.numRuns} runs`,
                `${output.config.simulationDays}d`,
                output.config.startMonth,
              ].map((tag) => (
                <span
                  key={tag}
                  className="inline-block font-mono text-[0.65rem] text-zinc-700 bg-inset border border-edge px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-[0.6rem] text-zinc-600 mt-1.5 font-mono">
              {new Date(output.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 bg-inset border border-edge rounded-lg hover:text-zinc-900 hover:border-edge-strong transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
        </div>
      </div>

      <SummaryTable results={output.results} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FulfillmentChart results={output.results} />
        <CountryBreakdown results={output.results} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyTimeSeries
          results={output.results}
          metric="cumulativeFulfilled"
          title="Cumulative Fulfilled"
          yLabel="Count"
        />
        <DailyTimeSeries
          results={output.results}
          metric="backlogSize"
          title="Backlog Size"
          yLabel="Waiting"
        />
      </div>

      <DailyTimeSeries
        results={output.results}
        metric="requestsFulfilledToday"
        title="Daily Fulfilled"
        yLabel="Fulfilled/Day"
      />

      <CountryTable results={output.results} />
    </div>
  );
}
