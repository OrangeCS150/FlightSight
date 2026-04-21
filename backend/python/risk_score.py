"""
Delay & Cancellation Risk Score (heuristic, 0-100).

Pure helper. Imported by `predict_flights_cli.py`. Does not mutate inputs.
All weights / thresholds are module-level constants so they can be tuned
without touching any call site.

Inputs come from fields already produced by `test_cost_prediction.predict_prices`:
    option = {
        "stops": int,
        "travel_duration_min": int,
        "flight_duration_min": int,
        "departure_hour": int,
        "confidence": "High" | "Low" | "Very Low" | ...,
        ...
    }
plus `departure_date_str` (ISO "YYYY-MM-DD").

Output:
    {
        "delayCancellationRiskScore": int 0..100,
        "riskBand": "Low" | "Moderate" | "High" | "Severe",
        "riskExplanation": str,
    }
"""

from datetime import datetime

# -------- Tunable constants (must sum to 100) --------
RISK_WEIGHTS = {
    "stops": 25,
    "departure_hour": 15,
    "layover_tightness": 20,
    "season": 15,
    "weekend": 10,
    "confidence": 15,
}

RISK_BANDS = [
    (0, 29, "Low"),
    (30, 59, "Moderate"),
    (60, 79, "High"),
    (80, 100, "Severe"),
]


def _clamp(value, lo=0, hi=100):
    try:
        v = float(value)
    except (TypeError, ValueError):
        return lo
    if v < lo:
        return lo
    if v > hi:
        return hi
    return v


def _stops_factor(stops):
    # 0 stops = 0, 1 = 40, 2 = 75, 3+ = 100
    try:
        s = int(stops)
    except (TypeError, ValueError):
        return 0
    return {0: 0, 1: 40, 2: 75}.get(s, 100 if s >= 3 else 0)


def _departure_hour_factor(hour):
    # Early morning (5-9) best, late evening worst.
    try:
        h = int(hour)
    except (TypeError, ValueError):
        return 50
    if 5 <= h <= 9:
        return 10
    if 10 <= h <= 14:
        return 30
    if 15 <= h <= 18:
        return 55
    if 19 <= h <= 22:
        return 75
    return 90  # 23, 0-4


def _layover_tightness_factor(travel_min, flight_min, stops):
    if not stops:
        return 0
    try:
        t = float(travel_min or 0)
        f = float(flight_min or 0)
    except (TypeError, ValueError):
        return 50
    layover = max(t - f, 0)
    if layover <= 0:
        return 50  # unknown
    # Per-stop layover slack in minutes
    per_stop = layover / max(int(stops), 1)
    if per_stop >= 180:
        return 10
    if per_stop >= 90:
        return 35
    if per_stop >= 45:
        return 65
    return 90


def _season_factor(month):
    # Rough US delay-season heuristic from public FAA summaries:
    # Dec-Feb: winter storms. Jun-Aug: thunderstorm peak. Shoulder lower.
    if month in (12, 1, 2):
        return 75
    if month in (6, 7, 8):
        return 70
    if month in (3, 11):
        return 50
    return 30  # Apr, May, Sep, Oct


def _weekend_factor(weekday):
    # weekday: Mon=0..Sun=6. Fri/Sun peak.
    if weekday in (4, 6):
        return 70
    if weekday == 5:
        return 45
    return 30


def _confidence_factor(conf):
    # Lower confidence in the price model = less reliable flight signal overall.
    if not conf:
        return 50
    c = str(conf).strip().lower()
    if c == "high":
        return 20
    if c == "low":
        return 55
    if c in ("very low", "verylow"):
        return 80
    return 50


def _band_for(score):
    for lo, hi, label in RISK_BANDS:
        if lo <= score <= hi:
            return label
    return "Low"


def compute_risk(option, departure_date_str):
    """Return {delayCancellationRiskScore, riskBand, riskExplanation}."""
    opt = option or {}

    stops = opt.get("stops", 0)
    travel_min = opt.get("travel_duration_min")
    flight_min = opt.get("flight_duration_min")
    dep_hour = opt.get("departure_hour", 9)
    conf = opt.get("confidence")

    try:
        dt = datetime.fromisoformat(str(departure_date_str)[:10])
        month = dt.month
        weekday = dt.weekday()
    except Exception:
        month = 0
        weekday = 0

    factors = {
        "stops": _stops_factor(stops),
        "departure_hour": _departure_hour_factor(dep_hour),
        "layover_tightness": _layover_tightness_factor(travel_min, flight_min, stops),
        "season": _season_factor(month),
        "weekend": _weekend_factor(weekday),
        "confidence": _confidence_factor(conf),
    }

    total = 0.0
    for key, weight in RISK_WEIGHTS.items():
        total += (_clamp(factors.get(key, 0)) / 100.0) * weight

    score = int(round(_clamp(total)))
    band = _band_for(score)

    # Pick the top-2 contributing factors for a concise human explanation
    contrib = sorted(
        ((k, (factors[k] / 100.0) * RISK_WEIGHTS[k]) for k in RISK_WEIGHTS),
        key=lambda kv: kv[1],
        reverse=True,
    )
    top_labels = {
        "stops": "connection count",
        "departure_hour": "departure time of day",
        "layover_tightness": "tight layover",
        "season": "seasonal weather pattern",
        "weekend": "peak travel day",
        "confidence": "low data confidence",
    }
    top = [top_labels[k] for k, _ in contrib[:2]]
    explanation = (
        f"{band} risk ({score}/100). Main drivers: " + ", ".join(top) + "."
    )

    return {
        "delayCancellationRiskScore": score,
        "riskBand": band,
        "riskExplanation": explanation,
    }
