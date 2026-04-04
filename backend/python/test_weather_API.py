import pandas as pd
import requests

# ================= CONFIG =================
API_KEY = "4EXWCBV3RCA7N4JHFNKBTLA63"
AIRPORT_FILE = "backend/data/airports_list.csv"

# ================= LOAD AIRPORT DATA =================
print("Loading airport data...")
airports = pd.read_csv(AIRPORT_FILE)

# Airport → city mapping
airport_to_city = dict(zip(airports["airport"], airports["city"]))

# ================= GET WEATHER =================
def get_weather(city, date):
    """
    Uses Visual Crossing API
    Supports past + future dates
    """

    url = f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{city}/{date}"

    params = {
        "unitGroup": "metric",
        "key": API_KEY,
        "contentType": "json"
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"Error fetching weather for {city}")
        return None

    data = response.json()

    # Get first day (since we request specific date)
    day = data["days"][0]

    return {
        "temperature": round(day["temp"], 2),
        "feels_like": round(day["feelslike"], 2),
        "humidity": day["humidity"],
        "precipitation": day["precip"],
        "condition": day["conditions"]
    }


# ================= MAIN FUNCTION =================
def get_route_weather(origin, dest, date):

    origin_city = airport_to_city.get(origin)
    dest_city = airport_to_city.get(dest)

    if not origin_city or not dest_city:
        print("Invalid airport code")
        return None

    print(f"Fetching weather for {origin_city} and {dest_city}...")

    origin_weather = get_weather(origin_city, date)
    dest_weather = get_weather(dest_city, date)

    result = {
        "origin": {
            "airport": origin,
            "city": origin_city,
            "weather": origin_weather
        },
        "destination": {
            "airport": dest,
            "city": dest_city,
            "weather": dest_weather
        }
    }
    return result


# ================= TEST =================
if __name__ == "__main__":

    origin = "LAX"
    dest = "JFK"
    date = "2026-06-13"   #  works (past or future)

    weather = get_route_weather(origin, dest, date)

    print("\nWeather Prediction: temp(C), feels_like(C), humidity(%), precip(mm), condition\n")

    if weather:
        print(f"{weather['origin']['city']} ({origin}):")
        print(weather["origin"]["weather"])

        print("\n-------------------\n")

        print(f"{weather['destination']['city']} ({dest}):")
        print(weather["destination"]["weather"])