import pandas as pd
import requests
import time

FLIGHTS_FILE = "flights_sample.csv"
AIRPORTS_FILE = "airports_list.csv"   # must include airport_code, city
OUTPUT_FILE = "flights_with_weather.csv"
WEATHER_LOOKUP_FILE = "weather_lookup.csv"


API_KEY = "YOUR_API_KEY_HERE"
REQUEST_DELAY = 1  # seconds (avoid rate limit)

# ================= LOAD DATA =================
print("Loading datasets...")
flights = pd.read_csv(FLIGHTS_FILE)
airports = pd.read_csv(AIRPORTS_FILE)

# ================= MAP AIRPORT → CITY =================
print("Mapping airports to cities...")
airport_to_city = dict(zip(airports["airport_code"], airports["city"]))

flights["origin_city"] = flights["startingAirport"].map(airport_to_city)
flights["destination_city"] = flights["destinationAirport"].map(airport_to_city)

# ================= CLEAN DATES =================
print("Formatting dates...")
flights["flightDate"] = pd.to_datetime(flights["flightDate"]).dt.strftime("%Y-%m-%d")

# ================= GET UNIQUE (CITY, DATE) =================
print("Extracting unique city-date pairs...")
unique_pairs = flights[["origin_city", "flightDate"]].drop_duplicates()

print(f"Total unique pairs: {len(unique_pairs)}")

# ================= WEATHER API FUNCTION =================
def get_weather(city, date):
    try:
        url = f"http://api.weatherapi.com/v1/history.json?key={API_KEY}&q={city}&dt={date}"
        response = requests.get(url).json()

        day = response["forecast"]["forecastday"][0]["day"]

        return {
            "city": city,
            "date": date,
            "temperature": day["avgtemp_c"],
            "rain": day["totalprecip_mm"],
            "condition": day["condition"]["text"]
        }
    except Exception as e:
        print(f"Error for {city}, {date}: {e}")
        return {
            "city": city,
            "date": date,
            "temperature": None,
            "rain": None,
            "condition": None
        }

# ================= BUILD WEATHER LOOKUP =================
print("Fetching weather data...")
weather_data = []

for i, row in unique_pairs.iterrows():
    city = row["origin_city"]
    date = row["flightDate"]

    if pd.isna(city):
        continue

    weather = get_weather(city, date)
    weather_data.append(weather)

    # Progress log
    if i % 100 == 0:
        print(f"Processed {i} / {len(unique_pairs)}")

    time.sleep(REQUEST_DELAY)

# Save lookup table
weather_df = pd.DataFrame(weather_data)
weather_df.to_csv(WEATHER_LOOKUP_FILE, index=False)
print("Weather lookup saved.")

# ================= MERGE WEATHER =================
print("Merging weather into flights dataset...")

flights = flights.merge(
    weather_df,
    left_on=["origin_city", "flightDate"],
    right_on=["city", "date"],
    how="left"
)

# Drop duplicate columns
flights.drop(columns=["city", "date"], inplace=True)

# ================= SAVE FINAL DATASET =================
print("Saving final dataset...")
flights.to_csv(OUTPUT_FILE, index=False)

print("Done! File saved as:", OUTPUT_FILE)