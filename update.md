# Update Log — Live Visualization & Comparison

## What Changed

### 1. Live 3-Algorithm Comparison Visualization

Added an animated day-by-day visualization that runs all 3 matching algorithms (FIFO, Priority, Weight-Optimised) side by side on the same scenario with the same seed — so they get identical requests and travellers, making the comparison fair.

**Components:**

- **Fulfillment Race Bar** — horizontal bars showing delivered/requested for each algorithm, updating each day so you can watch them race
- **Per-Algorithm Flow Diagram** — SVG showing Singapore (Changi) connected to 5 destination countries with animated dots when goods are dispatched and delivery counts on active lines
- **Per-Algorithm Pipeline** — vertical stages (Waiting → Matched → In Transit → Delivered) with today's activity deltas
- **Secondary Stats** — avg delivery time and wasted capacity % per algorithm
- **Shared Event Log** — scrolling feed of daily events (requests + travellers are identical across algorithms)
- **Completion Ranking** — final table ranking algorithms by fulfillment rate, avg delivery time, and wasted capacity

**Playback Controls:**

- Play/Pause, speed presets (1x, 2x, 5x, 10x), day scrubber for instant seeking, stop button
- Animation timing scales with playback speed
- All movement stops when simulation completes at day 30

### 2. Integrated Flow

Previously "Run Simulation" showed only static results. Now it:

1. Pre-computes the visualization instantly (~15ms for all 3 algorithms)
2. Shows the live visualization immediately
3. Runs the full Monte Carlo experiment in the background
4. Displays the statistical results (charts, tables) below once complete

Everything on one page — no separate visualization mode.

### 3. New Tunable Parameters

Two new sliders in the configuration panel:

- **Donation Requests / Day** (5–50, default 15) — controls the Poisson lambda for daily request generation. Lets you test: "what happens if demand doubles?"
- **Volunteers at Changi** (1–20, default 5) — controls the Singapore-side volunteer pool for handovers. This is the main throughput bottleneck. Lets you test: "what if we hire more volunteers?"

Both are threaded through the full simulation pipeline (config → generators → engine → snapshot engine → experiment runner).

### 4. Chart & Label Improvements

- Overall fulfillment chart: titled "Overall Fulfillment Rate (delivered / requested)" with subtitle explaining 95% confidence intervals
- Country breakdown chart: titled "Fulfillment Rate by Country (delivered / requested)"
- Comparison bar: column headers "Algorithm | Delivered / Requested | Rate"
- All tooltip text brightened for readability against dark background
- Tooltip labels now say "Fulfillment Rate" instead of generic "Rate"
- Fixed native select dropdown showing double chevron arrows

## New Files

| File                                                | Purpose                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `src/simulation/snapshotEngine.ts`                  | Simulation engine that captures per-day agent snapshots for replay   |
| `src/pages/LiveVisualization.tsx`                   | Main visualization page with shared playback and 3-column layout     |
| `src/components/visualization/FlowMap.tsx`          | Per-algorithm SVG flow diagram + pipeline stages + stats             |
| `src/components/visualization/ComparisonBar.tsx`    | Horizontal fulfillment race bar                                      |
| `src/components/visualization/PlaybackControls.tsx` | Play/pause, speed, scrubber, stop                                    |
| `src/components/visualization/EventLog.tsx`         | Shared scrolling event feed                                          |
| `src/components/visualization/LiveCounters.tsx`     | Animated stat counter cards (unused in current layout but available) |

## Modified Files

| File                                         | Change                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `src/simulation/types.ts`                    | Added `requestsPerDay` and `volunteersSingapore` to `SimulationConfig` |
| `src/simulation/generators.ts`               | Accept configurable requests/day and volunteer count                   |
| `src/simulation/engine.ts`                   | Pass config values to generators                                       |
| `src/simulation/runner.ts`                   | Accept and forward new parameters                                      |
| `src/App.tsx`                                | Merged visualization into main flow, removed separate watch mode       |
| `src/pages/SimulationSetup.tsx`              | Added 2 new sliders, removed algorithm picker                          |
| `src/components/charts/FulfillmentChart.tsx` | Better labels, brighter tooltips                                       |
| `src/components/charts/CountryBreakdown.tsx` | Better labels, brighter tooltips                                       |
| `src/index.css`                              | Visualization animations, select appearance fix                        |

## Key Design Decisions

- **Pre-compute + Replay** — simulation runs in <5ms per algorithm, so all 3 are pre-computed instantly and replayed with animation timers. No incremental engine refactoring needed.
- **Same Seed** — all 3 algorithms get identical RNG seeds, so they see the exact same requests and travellers. Only the matching logic differs. Fair comparison.
- **Dots = Today's Dispatches Only** — animated dots on the flow diagram show goods dispatched from Changi _today_, not cumulative in-transit. This prevents perpetual animation on high-traffic routes.
- **Volunteers as Bottleneck** — making the Singapore volunteer count tunable exposes the main throughput constraint. With 5 volunteers at 70-95% reliability, max ~4 handovers/day regardless of traveller supply.
