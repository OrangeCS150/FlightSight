"""
This script adds engineered features to the flight dataset, including:
- Number of legs
- Number of stops
- Direct flight flag
- Total duration (seconds and minutes)
- First departure time
- Last arrival time
- Departure and arrival hours
- Month, day of week, and weekend flag
"""


import pandas as pd
import numpy as np
import re

# ================= CONFIG =================
INPUT_FILE = "backend/data/flights_sample.csv"
OUTPUT_FILE = "backend/data/flights_engineered.csv"

# ================= LOAD DATA =================
print("Loading dataset...")
df = pd.read_csv(INPUT_FILE, low_memory=False)

# ================= HELPER FUNCTIONS =================

def safe_split(x):
    """Safely split '||' strings into list"""
    if pd.isna(x):
        return []
    return str(x).split("||")


def safe_int_list(x):
    """Convert '||' string into list of ints safely"""
    vals = safe_split(x)
    out = []
    for v in vals:
        try:
            out.append(int(float(v)))
        except:
            continue
    return out


def get_num_legs(x):
    return len(safe_split(x))


def get_total_duration(x):
    vals = safe_int_list(x)
    return sum(vals) if vals else np.nan


def get_first(x):
    vals = safe_int_list(x)
    return vals[0] if len(vals) > 0 else np.nan


def get_last(x):
    vals = safe_int_list(x)
    return vals[-1] if len(vals) > 0 else np.nan

def parse_duration(duration):
    hours = 0
    minutes = 0
    
    h_match = re.search(r'(\d+)H', duration)
    m_match = re.search(r'(\d+)M', duration)
    
    if h_match:
        hours = int(h_match.group(1))
    if m_match:
        minutes = int(m_match.group(1))
    
    return hours * 60 + minutes

# ================= FEATURE ENGINEERING =================
print("Extracting segment features...")

# Route
df["route"] = df["startingAirport"] + "_" + df["destinationAirport"]

# Main airline (first segment)
df["main_airline"] = df["segmentsAirlineName"].astype(str).apply(
    lambda x: x.split("||")[0]
)

# Number of legs
df["num_legs"] = df["segmentsDepartureTimeEpochSeconds"].apply(get_num_legs)

# Stops
df["num_stops"] = df["num_legs"] - 1
df["num_stops"] = df["num_stops"].clip(lower=0)

# Direct flight flag
df["is_direct"] = (df["num_stops"] == 0).astype(int)

# Travel duration (in minutes)
df["travel_duration_min"] = df["travelDuration"].apply(parse_duration)

# Total flight duration
df["total_duration_sec"] = df["segmentsDurationInSeconds"].apply(get_total_duration)
df["total_duration_min"] = df["total_duration_sec"] / 60

# First departure
df["first_departure"] = df["segmentsDepartureTimeEpochSeconds"].apply(get_first)

# Last arrival
df["last_arrival"] = df["segmentsArrivalTimeEpochSeconds"].apply(get_last)

# Convert to datetime safely
df["first_departure_dt"] = pd.to_datetime(df["first_departure"], unit="s", errors="coerce")
df["last_arrival_dt"] = pd.to_datetime(df["last_arrival"], unit="s", errors="coerce")

# Extract hours
df["departure_hour"] = df["first_departure_dt"].dt.hour
df["arrival_hour"] = df["last_arrival_dt"].dt.hour


# ================= DATE FEATURES =================
print("Extracting date features...")

df["flightDate"] = pd.to_datetime(df["flightDate"], errors="coerce")

df["month"] = df["flightDate"].dt.month
df["day_of_week"] = df["flightDate"].dt.dayofweek
df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

# ================= OPTIONAL CLEANING =================
print("Cleaning edge cases...")

# Replace impossible values
df["total_duration_sec"] = df["total_duration_sec"].replace(0, np.nan)

# ================= SAVE =================
print("Saving engineered dataset...")
df.to_csv(OUTPUT_FILE, index=False)

print("Done! Saved as:", OUTPUT_FILE)