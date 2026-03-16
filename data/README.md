# Data Collection & Preprocessing

This folder contains the scripts used to collect and preprocess real-world data
from Singapore's open data portal (data.gov.sg) for the Gebirah simulation.

## Data Sources

All data is from the Civil Aviation Authority of Singapore (CAAS) via data.gov.sg:

1. **Total Air Departures** - Dataset `d_90089b064caf754498b794466996c4c8`
   - Total outbound air passenger departures from Singapore (2024)
   - Used to calculate the base number of travellers per day

2. **Departures by Country** - Dataset `d_ba460709b5b56388bf8a5bcba84e0bfb`
   - Air passenger departures broken down by destination country (2024)
   - Used to calculate CAAS destination weights for traveller generation

3. **Monthly Departures** - Dataset `d_98e2567a033e812081b78aabe250fc13`
   - Monthly air passenger departure volumes for 2024
   - Used to calculate seasonal scaling factors

## Folder Structure

```
data/
├── README.md                          # This file
├── scripts/
│   ├── 01_fetch_total_departures.py   # Fetch total departures from data.gov.sg
│   ├── 02_fetch_country_departures.py # Fetch country-level departure data
│   ├── 03_fetch_monthly_departures.py # Fetch monthly departure data
│   └── 04_preprocess_all.py           # Combine all data into simulation constants
├── raw/
│   ├── total_departures_2024.json     # Raw API response for total departures
│   ├── country_departures_2024.json   # Raw API response for country departures
│   └── monthly_departures_2024.json   # Raw API response for monthly departures
└── processed/
    └── simulation_inputs.json         # Final preprocessed data for the simulation
```

## How to Reproduce

1. Install Python 3 (any version 3.7+)
2. Run scripts in order:
   ```bash
   cd data/scripts
   python 01_fetch_total_departures.py
   python 02_fetch_country_departures.py
   python 03_fetch_monthly_departures.py
   python 04_preprocess_all.py
   ```
3. Results will appear in `data/raw/` (API responses) and `data/processed/` (final outputs)

Note: data.gov.sg has rate limits. If you get a "TOO_MANY_REQUESTS" error, wait 30-60 seconds between API calls.
