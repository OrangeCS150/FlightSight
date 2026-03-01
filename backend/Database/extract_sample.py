""" 
Dataset used: https://www.kaggle.com/datasets/dilwong/flightprices

Since the dataset is very large with 82 million of records (rows), we will extract a random sample of
2 million records to be used for our analysis and modeling. 
This will help us to work with a manageable dataset while still retaining the diversity and patterns present in the original data.

It will be extracted randomly since the dataset is ordered by startingAirport, destinationAirport, and departureDate, 
which may introduce bias if we were to take a contiguous sample.
"""

import pandas as pd
import random

# Configuration - adjust paths and sample size as needed
sample_size = 2000000
file_path = "C:/Users/jonel/Downloads/itineraries.csv/itineraries.csv"
output_path = "flights_sample.csv"
chunk_size = 100000

reservoir = []
total_seen = 0  # Counts only VALID rows

# Count total rows in a CSV
def count_csv_rows(file_path):  
    with open(file_path, "r", encoding="utf-8") as f:
        row_count = sum(1 for line in f) - 1  # Subtract 1 if CSV has a header

    print(f"Total rows in CSV: {row_count}")

# Function to check if a row is valid (no NaNs, no empty strings)
def is_valid_row(row):
    if row.isnull().any():  # Check for NaNs
        return False
    if (row.astype(str).str.strip() == '').any():  # Check for empty strings
        return False
    return True

# Process CSV in chunks
for chunk in pd.read_csv(file_path, chunksize=chunk_size):
    for _, row in chunk.iterrows():
        if not is_valid_row(row):
            continue  # Skip invalid rows

        total_seen += 1
        if len(reservoir) < sample_size:
            reservoir.append(row)
        else:
            # Reservoir sampling replacement
            r = random.randint(0, total_seen - 1)
            if r < sample_size:
                reservoir[r] = row

    print(f"Processed chunk. Valid rows seen so far: {total_seen}")

# Convert to DataFrame
df_sample = pd.DataFrame(reservoir)

# Final check (just in case)
df_sample.dropna(inplace=True)

# Save to CSV
df_sample.to_csv(output_path, index=False)
print(f"Done. Sample saved to {output_path}. Final sample size: {len(df_sample)}")