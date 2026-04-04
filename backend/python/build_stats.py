"""
Calculates grouped statistics to use as a reference.

Since the user only inputs flight route and flight date, we can fill in the rest of 
details (features needed for training) using the mean values of the grouped features.
"""

import pandas as pd

# ================= CONFIG =================
INPUT_FILE = "backend/data/flights_engineered.csv"
OUTPUT_FILE = "backend/data/route_airline_stats.csv"

print("Loading dataset...")
df = pd.read_csv(INPUT_FILE, low_memory=False)

print(df.columns.tolist())  # Debug: check available columns

# ================= ADD ROUTE FEATURE =================
print("Creating route feature...")

df["route"] = df["startingAirport"] + "_" + df["destinationAirport"]

# ================= CLEAN REQUIRED COLUMNS =================
print("Cleaning essential columns...")

df = df.dropna(subset=[
    "route",
    "startingAirport",
    "destinationAirport",
    "main_airline",
    "num_stops",
    "totalFare"
])

# ================= FILTER STOPS =================
df = df[df["num_stops"].isin([0, 1, 2, 3])]

# ================= GROUPING =================
print("Computing grouped statistics...")

group_cols = [
    "route",
    "startingAirport",
    "destinationAirport",
    "main_airline",
    "num_stops"
]

stats = df.groupby(group_cols).agg({

    # Typical departure time
    "departure_hour": "mean",

    # Typical in-air flight time
    "total_duration_min": "mean",

    # Total travel duration
    "travel_duration_min": "mean",

    # Typical price (median is more robust)
    "totalFare": "median",

    # Typical seat availability
    "seatsRemaining": "mean"

}).reset_index()

counts = df.groupby(group_cols).size().reset_index(name="count")

stats = stats.merge(counts, on=group_cols)

# keep only groups with enough data
stats = stats[stats["count"] >= 4]

# ================= RENAME =================
stats.rename(columns={
    "totalFare": "avg_price",
    "seatsRemaining": "avg_seats"
}, inplace=True)

# ================= ROUND =================
print("Formatting values...")

stats["departure_hour"] = stats["departure_hour"].round().astype(int)
stats["total_duration_min"] = stats["total_duration_min"].round(1)
stats["travel_duration_min"] = stats["travel_duration_min"].round(1)
stats["avg_price"] = stats["avg_price"].round(2)
stats["avg_seats"] = stats["avg_seats"].round(1)

# ================= SAVE =================
print("Saving stats file...")
stats.to_csv(OUTPUT_FILE, index=False)

print("Done! Stats saved as:", OUTPUT_FILE)