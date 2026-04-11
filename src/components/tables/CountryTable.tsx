/**
 * Country-Level Results Table
 */

import { COUNTRIES } from "../../config/constants";
import { ALGORITHM_THEMES, TABLE_DIVIDER } from "../../config/theme";
import type { ExperimentResult } from "../../simulation/types";

function Tip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="relative group/tip cursor-help inline-flex items-center gap-1">
      {label}
      <svg className="w-3 h-3 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
      </svg>
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/tip:block w-52 bg-zinc-800 text-white text-[0.62rem] leading-relaxed rounded-lg px-2.5 py-1.5 z-20 shadow-lg whitespace-normal font-normal">
        {tip}
      </span>
    </span>
  );
}

interface Props {
  results: ExperimentResult[];
}

export default function CountryTable({ results }: Props) {
  if (results.length === 0) return null;

  const hasExpired = results.some((r) =>
    COUNTRIES.some((c) => r.avgSummary.byCountry[c]?.expired > 0)
  );

  const bestRateBadgeClass =
    "inline-block px-1.5 py-0.5 rounded border border-emerald-300/80 bg-emerald-100 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]";
  const bestDaysBadgeClass =
    "inline-block px-1.5 py-0.5 rounded border border-sky-300/80 bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]";

  const bestByCountry: Record<string, { bestRate: number; bestDays: number }> =
    {};

  for (const country of COUNTRIES) {
    let bestRate = -1;
    let bestDays = Infinity;

    for (const result of results) {
      const countryData = result.avgSummary.byCountry[country];
      if (!countryData) continue;

      if (countryData.fulfillmentRate > bestRate) {
        bestRate = countryData.fulfillmentRate;
      }

      if (countryData.avgDeliveryTimeDays < bestDays) {
        bestDays = countryData.avgDeliveryTimeDays;
      }
    }

    bestByCountry[country] = { bestRate, bestDays };
  }

  return (
    <div className='panel overflow-hidden'>
      <div className='px-5 py-3 border-b border-edge flex items-center justify-between'>
        <p className='section-label'>Per-country breakdown</p>
        <div className='flex items-center gap-3 text-[0.6rem] text-zinc-600 font-mono'>
          <span className='inline-flex items-center gap-1'>
            <span className='w-2 h-2 rounded-sm bg-emerald-500' />
            Best fulfillment
          </span>
          <span className='inline-flex items-center gap-1'>
            <span className='w-2 h-2 rounded-sm bg-sky-500' />
            Fastest delivery
          </span>
        </div>
      </div>

      <div className='overflow-x-auto data-table'>
        <table className='min-w-full'>
          <thead>
            <tr>
              <th className='px-4 py-3 text-left'>Country</th>
              <th className='px-4 py-3 text-left'>Algorithm</th>
              <th className='px-4 py-3 text-right'><Tip label="Requests" tip="Total donation requests received for this country over 30 days" /></th>
              <th className='px-4 py-3 text-right'><Tip label="Fulfilled" tip="Requests successfully delivered to recipients" /></th>
              <th className='px-4 py-3 text-right'><Tip label="Unfulfilled" tip="Requests that were not delivered by the end of the simulation" /></th>
              {hasExpired && <th className='px-4 py-3 text-right'><Tip label="Expired" tip="High-urgency requests that weren't matched in time and expired" /></th>}
              <th className='px-4 py-3 text-right'><Tip label="Rate" tip="Fulfillment rate — % of requests delivered for this country" /></th>
              <th className='px-4 py-3 text-right'><Tip label="Avg Days" tip="Average days from request posted to goods delivered — lower is better" /></th>
            </tr>
          </thead>
          <tbody>
            {COUNTRIES.map((country, countryIndex) =>
              results.map((result, resultIndex) => {
                const countryData = result.avgSummary.byCountry[country];
                if (!countryData) return null;

                const best = bestByCountry[country];
                const isBestRate =
                  countryData.fulfillmentRate === best.bestRate;
                const isBestDays =
                  countryData.avgDeliveryTimeDays === best.bestDays;
                const algorithmTheme = ALGORITHM_THEMES[result.algorithm];

                return (
                  <tr
                    key={`${country}-${result.algorithm}`}
                    className={countryIndex % 2 === 0 ? "" : "bg-raised/40"}
                    style={{
                      borderBottom:
                        resultIndex === results.length - 1
                          ? TABLE_DIVIDER
                          : undefined,
                    }}
                  >
                    {resultIndex === 0 && (
                      <td
                        rowSpan={results.length}
                        className='px-4 py-2 font-medium text-zinc-800 align-top'
                      >
                        {country}
                      </td>
                    )}

                    <td className='px-4 py-2 text-zinc-600'>
                      <span className='inline-flex items-center gap-1.5'>
                        <span
                          className='w-1.5 h-1.5 rounded-sm'
                          style={{ backgroundColor: algorithmTheme.hex }}
                        />
                        {algorithmTheme.label}
                      </span>
                    </td>

                    <td className='px-4 py-2 text-right font-mono text-zinc-700'>
                      {countryData.totalRequests}
                    </td>
                    <td className='px-4 py-2 text-right font-mono text-zinc-700'>
                      {countryData.fulfilled}
                    </td>
                    <td className='px-4 py-2 text-right font-mono text-zinc-700'>
                      {countryData.unfulfilled}
                    </td>
                    {hasExpired && (
                      <td className='px-4 py-2 text-right font-mono text-zinc-700'>
                        {countryData.expired}
                      </td>
                    )}

                    <td className='px-4 py-2 text-right font-mono font-medium'>
                      {isBestRate ? (
                        <span className={bestRateBadgeClass}>
                          {(countryData.fulfillmentRate * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className='text-zinc-500'>
                          {(countryData.fulfillmentRate * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>

                    <td className='px-4 py-2 text-right font-mono font-medium'>
                      {isBestDays ? (
                        <span className={bestDaysBadgeClass}>
                          {countryData.avgDeliveryTimeDays}
                        </span>
                      ) : (
                        <span className='text-zinc-500'>
                          {countryData.avgDeliveryTimeDays}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
