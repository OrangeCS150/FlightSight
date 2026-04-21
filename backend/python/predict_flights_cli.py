import argparse
import hashlib
import json
from datetime import datetime, timedelta

from test_cost_prediction import predict_prices
from risk_score import compute_risk


def build_leg_id(origin, destination, departure_date, airline, stops, idx):
    raw = f"{origin}|{destination}|{departure_date}|{airline}|{stops}|{idx}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]


def to_iso_times(departure_date, departure_hour, travel_duration_min):
    base = datetime.fromisoformat(departure_date)
    dep = base.replace(hour=int(departure_hour), minute=0, second=0, microsecond=0)
    arr = dep + timedelta(minutes=int(travel_duration_min))
    return dep.isoformat(), arr.isoformat()


def flatten_predictions(origin, destination, departure_date, grouped):
    flights = []

    for airline_group in grouped:
        airline = airline_group.get("airline", "Unknown")
        options = airline_group.get("options", [])

        for idx, option in enumerate(options, start=1):
            stops = int(option.get("stops", 0))
            travel_duration_min = int(option.get("travel_duration_min", 0))
            departure_hour = int(option.get("departure_hour", 9))
            departure_time, arrival_time = to_iso_times(
                departure_date,
                departure_hour,
                travel_duration_min,
            )

            risk = compute_risk(option, departure_date)

            flights.append({
                "legId": build_leg_id(origin, destination, departure_date, airline, stops, idx),
                "origin": origin,
                "destination": destination,
                "departureDate": departure_date,
                "airline": airline,
                "totalFare": float(option.get("price", 0)),
                "travelDuration": option.get("travel_time"),
                "flightTime": option.get("flight_time"),
                "layoverTime": option.get("layover_time"),
                "stops": stops,
                "seatAvailability": option.get("seat_availability", "Unknown"),
                "confidence": option.get("confidence", "Unknown"),
                "departureTime": departure_time,
                "arrivalTime": arrival_time,
                "isPredicted": True,
                "delayCancellationRiskScore": risk["delayCancellationRiskScore"],
                "riskBand": risk["riskBand"],
                "riskExplanation": risk["riskExplanation"],
            })

    flights.sort(key=lambda f: (f["totalFare"], f["stops"]))
    return flights


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--departureDate", required=True)
    args = parser.parse_args()

    origin = args.origin.upper().strip()
    destination = args.destination.upper().strip()
    departure_date = args.departureDate.strip()

    grouped = predict_prices(origin, destination, departure_date)
    flights = flatten_predictions(origin, destination, departure_date, grouped)

    print(json.dumps({
        "origin": origin,
        "destination": destination,
        "departureDate": departure_date,
        "count": len(flights),
        "flights": flights,
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(json.dumps({"error": str(err)}))
