/**
 * Results Page — charts, graphs, and AI insights (center section)
 * SummaryTable and CountryTable are rendered separately in the right panel
 */

import type { ScenarioOutput } from "../simulation/types";
import FulfillmentChart from "../components/charts/FulfillmentChart";
import DailyTimeSeries from "../components/charts/DailyTimeSeries";
import CountryBreakdown from "../components/charts/CountryBreakdown";
import InsightsPanel from "../components/insights/InsightsPanel";

interface Props {
  output: ScenarioOutput;
  onDownload: () => void;
}

export default function Results({ output, onDownload }: Props) {
  return (
    <div className="space-y-6">
      {/* Header row with export */}
      <div className="flex items-center justify-between">
        <p className="section-label">Charts & Insights</p>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 bg-inset border border-edge rounded-lg hover:text-zinc-900 hover:border-edge-strong transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export JSON
        </button>
      </div>

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

      <InsightsPanel output={output} />
    </div>
  );
}
