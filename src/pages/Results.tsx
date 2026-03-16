/**
 * Results Page
 * Displays all charts and tables after the simulation completes
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
  conservative: "Conservative (3% willing)",
  likely: "Likely (6% willing)",
  optimistic: "Optimistic (10% willing)",
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
      <div className="bg-white rounded-lg shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Simulation Results
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Scenario: {SCENARIO_LABELS[output.scenario]} |{" "}
            Operational reach: {(output.config.platformAdoptionRate * 100).toFixed(1)}% |{" "}
            {output.config.numRuns} runs per algorithm |{" "}
            {output.config.simulationDays} simulated days |{" "}
            Start month: {output.config.startMonth}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Generated: {new Date(output.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="mt-4 md:mt-0 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
        >
          Download JSON
        </button>
      </div>

      {/* Summary Table */}
      <SummaryTable results={output.results} />

      {/* Charts Row 1: Fulfillment + Country */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FulfillmentChart results={output.results} />
        <CountryBreakdown results={output.results} />
      </div>

      {/* Charts Row 2: Time Series */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyTimeSeries
          results={output.results}
          metric="cumulativeFulfilled"
          title="Cumulative Requests Fulfilled (Day 1-30)"
          yLabel="Count"
        />
        <DailyTimeSeries
          results={output.results}
          metric="backlogSize"
          title="Backlog Size Over Time (Day 1-30)"
          yLabel="Waiting Requests"
        />
      </div>

      {/* Daily fulfillment */}
      <DailyTimeSeries
        results={output.results}
        metric="requestsFulfilledToday"
        title="Daily Requests Fulfilled (Day 1-30)"
        yLabel="Fulfilled/Day"
      />

      {/* Country Table */}
      <CountryTable results={output.results} />
    </div>
  );
}
