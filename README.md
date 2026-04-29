# Group 4 Systems Design Studio DAI X Gebirah Simulation

An Agent-Based Simulation (ABS) for [Gebirah](https://gebirah.org), a Singapore-based humanitarian organisation. It models using travellers' spare baggage capacity to deliver donations from Singapore to five Southeast Asian countries. Myanmar, Cambodia, Indonesia, Philippines, and Vietnam and compares three matching algorithms to answer:

> _How might we minimise the total number of monthly unfulfilled donation requests by leveraging travellers' excess baggage?_


## Quick Start

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

Open the URL printed by Vite (usually http://localhost:5173).

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **Charts:** Recharts
- **Build:** Vite 8
- **Routing:** React Router v7
- **Backend:** Supabase (optional, for storing results)
- **Deployment:** Vercel (auto-deploys from `main`)

## How the Simulation Works

Each run simulates **30 days**. On each day:

1. **Generate donation requests** Poisson(~15/day), split across countries by HDI weights (MM 35%, KH 25%, ID 20%, PH 15%, VN 5%)
2. **Generate travellers** Sampled from real Changi Airport data (24,218 daily departures → 18,274 to target countries) × willingness × operational reach
3. **Match requests to travellers** Using one of three algorithms (below)
4. **Dispatch volunteers** 5 Singapore-side volunteers handle airport handovers; each has 70–95% reliability (Bernoulli). No-shows re-queue requests
5. **Process arrivals** Goods in transit for 2 days become "Fulfilled"
6. **Record daily metrics**

### The Three Matching Algorithms

| Algorithm            | How it works                                                      | Best at                                    |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| **FIFO**             | Oldest request first                                              | Fairness                                   |
| **Priority**         | Urgent requests first, then by date                               | Urgent fulfillment rate (~76%)             |
| **Weight-Optimised** | 0/1 Knapsack — best fills the traveller's spare capacity          | Total kg delivered, well-supplied lanes    |

The simulation uses a **seeded RNG (Mulberry32)** so runs are reproducible. Each algorithm × run combination gets a unique seed, and we run **20 runs per algorithm** by default with **95% confidence intervals** to show whether differences are statistically significant.

## Project Structure

```
src/
├── config/
│   └── constants.ts          # All simulation parameters (sources documented inline)
├── simulation/
│   ├── distributions.ts      # RNG + probability distributions
│   ├── generators.ts         # Generates donation requests, travellers, volunteers
│   ├── engine.ts             # The 30-day daily loop
│   ├── runner.ts             # Runs all 3 algorithms × N runs, averages, computes CIs
│   ├── volunteerDispatch.ts  # Volunteer handover at airport
│   ├── types.ts              # Type definitions
│   └── matching/
│       ├── fifo.ts
│       ├── priority.ts
│       └── weightOptimised.ts
├── pages/
│   ├── SimulationSetup.tsx   # Config (willingness, reach, runs, start month)
│   ├── SimulationProgress.tsx
│   └── Results.tsx           # Dashboard with tables + charts
├── components/
│   ├── charts/               # FulfillmentChart, CountryBreakdown, DailyTimeSeries
│   └── tables/               # SummaryTable, CountryTable
├── services/
│   └── simulationService.ts  # Saves/loads results to Supabase
└── lib/
    └── supabase.ts
data/
├── raw/                      # Raw CSVs from data.gov.sg
├── processed/                # Cleaned data used by constants.ts
└── scripts/                  # Data processing scripts
```

## Key Parameters

All in [src/config/constants.ts](src/config/constants.ts) with inline source citations.

| Parameter                   | Value                                        | Source                  |
| --------------------------- | -------------------------------------------- | ----------------------- |
| Daily Changi departures     | 24,218                                       | CAAS 2024 (data.gov.sg) |
| Departures to 5 targets     | 18,274                                       | CAAS country breakdown  |
| Willingness rates           | 3% / 6% / 10%                                | CAF World Giving Index  |
| Operational reach           | 0.1% – 6.0% (UI slider)                      | Tunable                 |
| Requests per day            | 15                                           | Project report          |
| HDI request weights         | MM 35%, KH 25%, ID 20%, PH 15%, VN 5%        | Project report          |
| Destination weights (CAAS)  | ID 54%, PH 22.7%, VN 17.3%, KH 3.8%, MM 2.2% | CAAS passenger data     |
| IATA max baggage            | 32 kg                                        | IATA standard           |
| Personal luggage            | Gamma(shape=5, scale=3.18), mean ≈ 15.9 kg   | Changi data             |
| Urgency split               | High 20%, Medium 50%, Low 30%                | Project report          |
| Volunteer reliability       | 70–95% (Bernoulli)                           | Project report          |
| Volunteers                  | 5 in SG + 3 per destination                  | Project report          |
| Simulation length           | 30 days                                      | Project report          |
| Default runs                | 20 per algorithm                             | Statistical significance |

## Output Metrics

| Metric                   | Meaning                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| Total Requests Generated | Total donation requests over 30 days                                   |
| Total Fulfilled          | Matched, handed over, and delivered                                    |
| Fulfillment Rate         | Fulfilled / Generated                                                  |
| Avg Delivery Time        | Days from request posted to delivery                                   |
| Urgent Fulfillment Rate  | Fulfillment rate for High-urgency requests only                        |
| Total Weight Delivered   | Total kg delivered                                                     |
| Avg Backlog Size         | Avg number of waiting (unmatched) requests at end of each day          |
| Wasted Capacity Rate     | % of travellers who departed without carrying donations                |
| Avg Capacity Utilisation | Among matched travellers, how full their spare capacity was            |
| 95% CI                   | Confidence interval — non-overlapping CIs indicate statistical significance |

## Data Sources

All from [data.gov.sg](https://data.gov.sg):

- **Air passenger departures:** dataset `d_90089b064caf754498b794466996c4c8`
- **Destination breakdown:** dataset `d_ba460709b5b56388bf8a5bcba84e0bfb`
- **Monthly seasonality:** dataset `d_98e2567a033e812081b78aabe250fc13`

Full methodology in [data/README.md](data/README.md).

