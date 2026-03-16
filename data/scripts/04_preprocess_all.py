"""
Script 4: Preprocess All Data into Simulation Inputs

This script takes the raw data collected from data.gov.sg (Scripts 01-03)
and combines it with the parameters from our midterms report to produce
a single JSON file that the simulation will use as input.

The output file (simulation_inputs.json) contains:
- Total daily travellers from Changi
- CAAS destination weights (where travellers fly to)
- Seasonal scaling factors (month-by-month adjustments)
- HDI-based request weights (where donation requests come from)
- All distribution parameters from the report

This is the bridge between "raw data from the real world" and
"numbers the simulation engine uses".
"""

import json
import os

def preprocess():
    print("=" * 60)
    print("Preprocessing all data into simulation inputs")
    print("=" * 60)

    # =========================================================
    # SECTION 1: Data from data.gov.sg (fetched in Scripts 01-03)
    # =========================================================
    print("\n--- Section 1: Real-world data from CAAS / data.gov.sg ---")

    # Total air departures (from Script 01)
    total_annual_departures = 8_839_546
    daily_departures = round(total_annual_departures / 365)
    print(f"Total annual air departures (2024): {total_annual_departures:,}")
    print(f"Daily average: {daily_departures:,}")

    # Country-level departures (from Script 02)
    # These are the actual passenger counts to our 5 target countries
    country_passengers = {
        "Indonesia": 3_603_194,
        "Philippines": 1_511_701,
        "Vietnam": 1_155_207,
        "Cambodia": 250_000,   # Estimated from "Other SEA" group
        "Myanmar": 150_000,     # Estimated from "Other SEA" group
    }
    total_target = sum(country_passengers.values())
    caas_destination_weights = {
        country: round(count / total_target, 4)
        for country, count in country_passengers.items()
    }

    print(f"\nCAAS destination weights (share of travellers to target countries):")
    for country, weight in caas_destination_weights.items():
        print(f"  {country}: {weight:.1%}")

    # Monthly seasonal factors (from Script 03)
    monthly_passengers = {
        "Jan": 679_117, "Feb": 674_023, "Mar": 719_067,
        "Apr": 733_652, "May": 716_098, "Jun": 784_996,
        "Jul": 797_893, "Aug": 769_453, "Sep": 700_297,
        "Oct": 745_489, "Nov": 760_233, "Dec": 839_228,
    }
    avg_monthly = sum(monthly_passengers.values()) / 12
    seasonal_factors = {
        month: round(count / avg_monthly, 3)
        for month, count in monthly_passengers.items()
    }

    print(f"\nSeasonal factors (monthly):")
    for month, factor in seasonal_factors.items():
        label = "peak" if factor > 1.0 else "off-peak"
        print(f"  {month}: {factor:.3f} ({label})")

    # =========================================================
    # SECTION 2: Parameters from the midterms report
    # =========================================================
    print(f"\n--- Section 2: Parameters from the midterms report ---")

    # HDI-based request weights (Table 3 in report)
    # These determine where donation REQUESTS come from
    # Higher HDI deficit = more humanitarian need = more requests
    hdi_request_weights = {
        "Myanmar": 0.35,
        "Cambodia": 0.25,
        "Indonesia": 0.20,
        "Philippines": 0.15,
        "Vietnam": 0.05,
    }
    print(f"\nHDI request weights (donation demand distribution):")
    for country, weight in hdi_request_weights.items():
        print(f"  {country}: {weight:.0%}")

    # Willingness scenarios (Section 3.2)
    willingness_scenarios = {
        "conservative": 0.03,
        "likely": 0.06,
        "optimistic": 0.10,
    }
    print(f"\nWillingness scenarios:")
    for scenario, rate in willingness_scenarios.items():
        daily_willing = round(daily_departures * (total_target / total_annual_departures) * rate)
        print(f"  {scenario}: {rate:.0%} → ~{daily_willing} willing travellers/day to target countries")

    # Distribution parameters
    print(f"\nDistribution parameters:")

    # Poisson for request arrivals (Section 4.7.3)
    requests_per_day = 10
    poisson_lambda = requests_per_day / 24  # per hour
    print(f"  Request arrivals: Poisson(λ={poisson_lambda:.2f}/hour) → ~{requests_per_day}/day")

    # Gamma for personal luggage weight (Section 3.2)
    gamma_mean = 15.9  # kg
    gamma_shape = 5.0
    gamma_scale = gamma_mean / gamma_shape  # = 3.18
    print(f"  Personal luggage: Gamma(shape={gamma_shape}, scale={gamma_scale:.2f}) → mean {gamma_mean}kg")

    # Baggage parameters
    iata_max = 32  # kg maximum checked baggage
    safety_buffer = 2  # kg buffer
    # Spare capacity = allowance - personal_luggage - buffer
    print(f"  IATA max baggage: {iata_max}kg")
    print(f"  Safety buffer: {safety_buffer}kg")
    print(f"  Spare capacity formula: {iata_max}kg - personal_luggage - {safety_buffer}kg")

    # Volunteer parameters
    volunteer_reliability_min = 0.70
    volunteer_reliability_max = 0.95
    print(f"  Volunteer reliability: {volunteer_reliability_min:.0%} - {volunteer_reliability_max:.0%}")

    # Request weight range
    request_weight_min = 1  # kg
    request_weight_max = 15  # kg
    print(f"  Request weight range: {request_weight_min}-{request_weight_max}kg")

    # Urgency distribution
    urgency_distribution = {"High": 0.2, "Medium": 0.5, "Low": 0.3}
    print(f"  Urgency distribution: {urgency_distribution}")

    # Simulation parameters
    simulation_days = 30
    print(f"\nSimulation parameters:")
    print(f"  Duration: {simulation_days} days")
    print(f"  Time step: 1 day")

    # =========================================================
    # SECTION 3: Combine everything into output JSON
    # =========================================================
    simulation_inputs = {
        "_metadata": {
            "description": "Preprocessed simulation inputs for the Gebirah ABS",
            "data_sources": [
                {
                    "name": "Total Air Departures",
                    "source": "CAAS via data.gov.sg",
                    "dataset_id": "d_90089b064caf754498b794466996c4c8",
                    "year": 2024,
                },
                {
                    "name": "Air Departures by Country",
                    "source": "CAAS via data.gov.sg",
                    "dataset_id": "d_ba460709b5b56388bf8a5bcba84e0bfb",
                    "year": 2024,
                },
                {
                    "name": "Monthly Air Departures",
                    "source": "CAAS via data.gov.sg",
                    "dataset_id": "d_98e2567a033e812081b78aabe250fc13",
                    "year": 2024,
                },
            ],
            "report_reference": "Oral Report 1 - Midterms (60.008 Systems Design Studio)",
        },
        "traveller_data": {
            "total_annual_departures": total_annual_departures,
            "daily_average_departures": daily_departures,
            "country_passengers": country_passengers,
            "caas_destination_weights": caas_destination_weights,
            "monthly_passengers": monthly_passengers,
            "seasonal_factors": seasonal_factors,
            "notes": {
                "Myanmar": "Not individually listed in CAAS data; estimated from 'Other Countries In South East Asia' (539,846 total) based on typical SG-Myanmar flight volumes",
                "Cambodia": "Not individually listed in CAAS data; estimated from 'Other Countries In South East Asia' (539,846 total) based on typical SG-Cambodia flight volumes",
            },
        },
        "request_data": {
            "hdi_request_weights": hdi_request_weights,
            "requests_per_day": requests_per_day,
            "poisson_lambda_per_hour": round(poisson_lambda, 4),
        },
        "distribution_parameters": {
            "personal_luggage_gamma": {
                "mean_kg": gamma_mean,
                "shape": gamma_shape,
                "scale": round(gamma_scale, 2),
            },
            "baggage": {
                "iata_max_kg": iata_max,
                "safety_buffer_kg": safety_buffer,
            },
            "request_weight": {
                "min_kg": request_weight_min,
                "max_kg": request_weight_max,
            },
            "urgency_distribution": urgency_distribution,
            "volunteer_reliability": {
                "min": volunteer_reliability_min,
                "max": volunteer_reliability_max,
            },
        },
        "willingness_scenarios": willingness_scenarios,
        "simulation_parameters": {
            "duration_days": simulation_days,
            "time_step": "daily",
        },
    }

    # Save the output
    output_path = os.path.join(os.path.dirname(__file__), "..", "processed", "simulation_inputs.json")
    with open(output_path, "w") as f:
        json.dump(simulation_inputs, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"OUTPUT: Simulation inputs saved to {output_path}")
    print(f"{'=' * 60}")

    return simulation_inputs


if __name__ == "__main__":
    result = preprocess()
    print(f"\nDone! The simulation can now read from data/processed/simulation_inputs.json")
