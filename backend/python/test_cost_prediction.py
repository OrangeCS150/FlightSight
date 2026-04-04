import pandas as pd
import numpy as np
import joblib

# ================= CONFIG =================
STATS_FILE = "backend/data/route_airline_stats.csv"
MODEL_FILE = "backend/data/price_model.pkl"

# ================= LOAD =================
stats = pd.read_csv(STATS_FILE)
model = joblib.load(MODEL_FILE)

DEBUG_ALL_STOPS = False

# ================= FALLBACK + CONFIDENCE =================
def get_stats(origin, dest, airline, stops):

    route = f"{origin}_{dest}"

    # Level 1 → BEST (route + airline)
    row = stats[
        (stats["route"] == route) &
        (stats["startingAirport"] == origin) &
        (stats["destinationAirport"] == dest) &
        (stats["main_airline"] == airline) &
        (stats["num_stops"] == stops)
    ]
    if not row.empty:
        return row.iloc[0], "High"

    # Level 2 → route only
    row = stats[
        (stats["route"] == route) &
        (stats["startingAirport"] == origin) &
        (stats["destinationAirport"] == dest) &
        (stats["num_stops"] == stops)
    ]
    if not row.empty:
        return row.iloc[0], "Low"

    # Level 3 → airline only
    row = stats[
        (stats["main_airline"] == airline) &
        (stats["num_stops"] == stops)
    ]
    if not row.empty:
        return row.iloc[0], "Low"

    # Level 4 → global fallback
    row = stats[
        (stats["num_stops"] == stops)
    ]
    if not row.empty:
        return row.iloc[0], "Very Low"

    return None, None


# ================= MAIN =================
def predict_prices(origin, dest, date_str):

    route = f"{origin}_{dest}"
    date = pd.to_datetime(date_str)

    month = date.month
    day_of_week = date.dayofweek
    is_weekend = int(day_of_week in [5, 6])

    airlines = stats["main_airline"].unique()

    rows = []

    # ================= BUILD INPUT =================
    for airline in airlines:

        if DEBUG_ALL_STOPS:
            available_stops = [0, 1, 2, 3]   # force all stops
        else:
            available_stops = stats[
                (stats["startingAirport"] == origin) &
                (stats["destinationAirport"] == dest) &
                (stats["main_airline"] == airline)
            ]["num_stops"].unique()

        if len(available_stops) == 0:
            continue

        for stops in available_stops:

            stat_row, confidence = get_stats(origin, dest, airline, stops)

            if stat_row is None:
                continue

            row = {
                "startingAirport": origin,
                "destinationAirport": dest,
                "route": route,
                "main_airline": airline,
                "num_stops": int(stops),

                "month": month,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,

                "departure_hour": stat_row["departure_hour"],
                "total_duration_min": stat_row["total_duration_min"],
                "travel_duration_min": stat_row["travel_duration_min"],

                "avg_seats": stat_row["avg_seats"],

                "confidence": confidence
            }

            rows.append(row)

    df_inputs = pd.DataFrame(rows)

    if df_inputs.empty:
        return []

    # ================= PREDICT =================
    pred_log = model.predict(df_inputs.drop(columns=["confidence"]))
    predictions = np.expm1(pred_log)

    df_inputs["predicted_price"] = predictions.round(2)

    # ================= FORMAT OUTPUT =================
    results = []

    for airline in df_inputs["main_airline"].unique():

        airline_rows = df_inputs[df_inputs["main_airline"] == airline]

        result = {
            "airline": airline,
            "options": []
        }

        for _, row in airline_rows.iterrows():
            result["options"].append({
                "stops": int(row["num_stops"]),
                "price": float(row["predicted_price"]),
                "confidence": row["confidence"],

                "travel_time": format_duration(row["travel_duration_min"]),
                "flight_time": format_duration(row["total_duration_min"]),
                "layover_time": format_duration(
                    row["travel_duration_min"] - row["total_duration_min"]
                ) if row["num_stops"] > 0 else "Non-stop",
                
                "seat_availability": seat_label(row["avg_seats"])
            })

        # Sort by number of stops (0 → 1 → 2)
        result["options"] = sorted(result["options"], key=lambda x: x["stops"])

        results.append(result)

    return results


def format_duration(minutes):
    if pd.isna(minutes):
        return None

    minutes = int(round(minutes))
    hours = minutes // 60
    mins = minutes % 60

    if hours > 0:
        return f"{hours}h {mins}m"
    else:
        return f"{mins}m"


def seat_label(avg_seats):
    if pd.isna(avg_seats):
        return "Unknown"

    if avg_seats >= 8:
        return "High availability"
    elif avg_seats >= 4:
        return "Moderate availability"
    elif avg_seats >= 1:
        return "Low availability"
    else:
        return "Very limited"


# ================= TEST =================
if __name__ == "__main__":

    origin = "LAX"
    dest = "JFK"
    date = "2026-04-15"

    results = predict_prices(origin, dest, date)

    print("\nPredicted Prices:\n")

    for r in results:
        print(f"{r['airline']}:")

        for option in r["options"]:
            print(f"  ➤ {option['stops']} stop(s)")
            print(f"      Price: ${option['price']}")
            print(f"      Travel Time: {option['travel_time']}")
            print(f"      Flight Time: {option['flight_time']}")
            print(f"      Layover: {option['layover_time']}")
            print(f"      Seats: {option['seat_availability']}")
            print(f"      Confidence: {option['confidence']}")
        print()