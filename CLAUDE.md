# Gebirah Simulation - Project Guide

## What is this?

An **Agent-Based Simulation (ABS)** for [Gebirah](https://gebirah.org), a Singapore-based humanitarian org. It simulates using travellers' spare baggage capacity to deliver donations to 5 SEA countries: Myanmar, Cambodia, Indonesia, Philippines, Vietnam.

The simulation compares **3 matching algorithms** (FIFO, Priority-Based, Weight-Optimised) to answer: _"How might we minimise the total number of monthly unfulfilled donation requests by leveraging travellers' excess baggage?"_

Built for **60.008 Systems Design Studio** at SUTD.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Recharts (charts)
- **Build:** Vite 8
- **Backend:** Supabase (stores simulation results)
- **Deployment:** Vercel
- **Routing:** React Router v7

## Quick Start

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── config/
│   └── constants.ts          # ALL simulation parameters (data sources documented inline)
├── simulation/
│   ├── distributions.ts      # RNG + probability distributions (Poisson, Gamma, Bernoulli, etc.)
│   ├── generators.ts         # Creates agents: donation requests, travellers, volunteers
│   ├── engine.ts             # The 30-day daily loop (generate → match → dispatch → record)
│   ├── runner.ts             # Runs all 3 algorithms × N runs, averages results, computes CIs
│   ├── volunteerDispatch.ts  # Volunteer handover at airport (Bernoulli reliability check)
│   ├── types.ts              # TypeScript type definitions for all agents and metrics
│   └── matching/
│       ├── index.ts          # Router to pick the right algorithm
│       ├── fifo.ts           # First In, First Out matching
│       ├── priority.ts       # Urgent requests first, then by date
│       └── weightOptimised.ts # 0/1 Knapsack to maximise kg per traveller
├── pages/
│   ├── SimulationSetup.tsx   # Config page (willingness, operational reach, runs, start month)
│   ├── SimulationProgress.tsx # Progress bar while simulation runs
│   └── Results.tsx           # Results dashboard with tables and charts
├── components/
│   ├── charts/               # FulfillmentChart, CountryBreakdown, DailyTimeSeries
│   └── tables/               # SummaryTable, CountryTable
├── services/
│   └── simulationService.ts  # Saves/loads results to Supabase
├── lib/
│   └── supabase.ts           # Supabase client
├── App.tsx                   # Router setup
├── main.tsx                  # Entry point
└── index.css                 # Tailwind styles
data/
├── raw/                      # Raw CSV data from data.gov.sg
├── processed/                # Cleaned data used by constants.ts
├── scripts/                  # Data processing scripts
└── README.md                 # Data sources and methodology
```

## How the Simulation Works

### The Daily Loop (engine.ts)

Each simulation runs for **30 days**. Every day:

1. **Generate donation requests** — Poisson(~15/day), split across countries by HDI weights (Myanmar 35%, Cambodia 25%, Indonesia 20%, Philippines 15%, Vietnam 5%)
2. **Generate travellers** — From Changi Airport data: 24,218 daily departures → 18,274 to target countries → × willingness rate → × operational reach → Poisson sampling per country
3. **Match requests to travellers** — Using FIFO, Priority, or Weight-Optimised algorithm
4. **Dispatch volunteers** — 5 Singapore-side volunteers do airport handovers. Each has 70-95% reliability (Bernoulli). No-show = requests re-queued
5. **Process arrivals** — Goods in transit for 2 days become "Fulfilled"
6. **Record daily metrics**

### The 3 Matching Algorithms

| Algorithm            | How it works                                                                            | Best at                                                            |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **FIFO**             | Oldest request first                                                                    | Fairness — no one gets special treatment                           |
| **Priority**         | Urgent (High) requests first, then by date                                              | Urgent fulfillment rate (76% vs ~44% for others)                   |
| **Weight-Optimised** | 0/1 Knapsack — picks combination of requests that best fills traveller's spare capacity | Total kg delivered, overall fulfillment in well-supplied countries |

### When each algorithm wins

- **Priority wins** in supply-starved countries (e.g. Myanmar: few travellers, many requests) — the few travellers go to urgent cases
- **Weight-Optimised wins** in well-supplied countries (e.g. Indonesia, Cambodia) — enough travellers to be picky about weight-matching, squeezing more deliveries out of available capacity
- **FIFO** rarely wins on any metric but is the fairest baseline

### Randomness and Seeds

The simulation uses a **seeded RNG** (Mulberry32 algorithm) so results are reproducible. Same seed = same results.

- Each algorithm+run combination gets a unique seed: `hashSeed("fifo", 0)`, `hashSeed("priority", 0)`, etc.
- The seed produces a deterministic sequence of random numbers used for ALL random decisions (request count, country assignment, weight, urgency, traveller count, baggage, volunteer reliability)
- Different algorithms get different seeds because they can't share one (the matching step consumes different numbers of random values, throwing subsequent steps out of sync)
- To compensate, we run **20 runs per algorithm** and average, with **95% confidence intervals** to show whether differences are statistically significant

### Key Parameters (all in constants.ts)

| Parameter                        | Value                                        | Source                                 |
| -------------------------------- | -------------------------------------------- | -------------------------------------- |
| Daily departures from Changi     | 24,218                                       | CAAS 2024 data (data.gov.sg)           |
| Departures to 5 target countries | 18,274                                       | CAAS country breakdown                 |
| Willingness rates                | 3% / 6% / 10%                                | CAF World Giving Index                 |
| Operational reach                | 0.1% – 6.0% (slider)                         | Tunable — represents platform adoption |
| Requests per day                 | 15                                           | Report Section 4.7.3                   |
| HDI request weights              | MM:35%, KH:25%, ID:20%, PH:15%, VN:5%        | Report Table 3                         |
| CAAS destination weights         | ID:54%, PH:22.7%, VN:17.3%, KH:3.8%, MM:2.2% | CAAS passenger data                    |
| IATA max baggage                 | 32 kg                                        | IATA standard                          |
| Personal luggage                 | Gamma(shape=5, scale=3.18), mean=15.9kg      | Changi Airport data                    |
| Safety buffer                    | 2 kg                                         | Conservative margin                    |
| Urgency distribution             | High:20%, Medium:50%, Low:30%                | Report                                 |
| Volunteer reliability            | 70-95% (Bernoulli)                           | Report Section 4.7.2                   |
| Volunteers                       | 5 in Singapore, 3 per destination (20 total) | Report                                 |
| Simulation length                | 30 days                                      | Report                                 |
| Default runs                     | 20 per algorithm                             | Statistical significance               |
| Seasonal factors                 | Monthly multipliers (0.907–1.129)            | CAAS monthly data                      |

### Traveller Count Formula

```
travellers/day for a country =
    DAILY_TARGET_DEPARTURES (18,274)
    × seasonal_factor (e.g. 1.056 for Jun)
    × CAAS_destination_weight (e.g. 0.54 for Indonesia)
    × willingness_rate (e.g. 0.06 for "likely")
    × operational_reach (e.g. 0.054 for 5.4%)
```

Example: Indonesia in June at 6% willing, 5.4% reach = 18,274 × 1.056 × 0.54 × 0.06 × 0.054 ≈ 32/day

### Output Metrics Explained

| Metric                   | What it means                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Total Requests Generated | Total donation requests over 30 days                                                          |
| Total Fulfilled          | Requests that were matched, handed over, and delivered                                        |
| Fulfillment Rate         | Fulfilled / Generated (higher = better)                                                       |
| Avg Delivery Time        | Days from request posted to goods delivered                                                   |
| Urgent Fulfillment Rate  | Fulfillment rate for High-urgency requests only                                               |
| Total Weight Delivered   | Total kg of goods successfully delivered                                                      |
| Avg Backlog Size         | Average number of waiting (unmatched) requests at end of each day                             |
| Wasted Capacity Rate     | % of travellers who departed without carrying any donations                                   |
| Avg Capacity Utilisation | Among matched travellers, how full was their spare capacity                                   |
| 95% CI                   | Confidence interval — if two metrics' CIs don't overlap, the difference is statistically real |

### Per-Country Breakdown Columns

| Column      | What it means                                                |
| ----------- | ------------------------------------------------------------ |
| Requests    | Total requests for that country over 30 days                 |
| Fulfilled   | How many were delivered                                      |
| Unfulfilled | Requests - Fulfilled                                         |
| Rate        | Fulfilled / Requests as percentage                           |
| Avg Days    | Average delivery time for fulfilled requests in that country |

### How to Fact-Check Simulation Output

1. **Request distribution:** Sum requests across all countries → Myanmar share should be ~35%, Cambodia ~25%, etc.
2. **Fulfilled + Unfulfilled = Requests** for each row
3. **Rate = Fulfilled / Requests** — verify the math
4. **Traveller counts:** Use the formula above and compare against the UI's displayed numbers
5. **Total requests over 30 days:** Should be roughly 15/day × 30 × seasonal_factor ≈ 450-480

## Data Sources (all from data.gov.sg)

- Air passenger departures: Dataset `d_90089b064caf754498b794466996c4c8`
- Destination breakdown: Dataset `d_ba460709b5b56388bf8a5bcba84e0bfb`
- Monthly seasonality: Dataset `d_98e2567a033e812081b78aabe250fc13`
- See `data/README.md` for full methodology

## Deployment

- **Vercel:** Auto-deploys from main branch
- **Supabase:** Stores simulation results (connection config in `supabase/` folder)
- **`.npmrc`:** Contains `legacy-peer-deps=true` to fix Vercel peer dependency conflicts
