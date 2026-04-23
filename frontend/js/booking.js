// booking.js

const API_BASE = "http://localhost:3000";

async function getJSON(path) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  console.log("[FlightSight] Request URL:", url);

  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.error("[FlightSight] API response error:", {
        url,
        status: r.status,
        statusText: r.statusText,
      });
      throw new Error(`${url} failed: ${r.status} ${r.statusText}`);
    }
    return r.json();
  } catch (err) {
    console.error("[FlightSight] API fetch failed:", { url, error: err });
    throw err;
  }
}

function getSelectedFlight() {
  const raw = localStorage.getItem("selectedFlight");
  if (!raw) return null;

  try {
    const flight = JSON.parse(raw);
    const requiredKeys = [
      "legId",
      "origin",
      "destination",
      "departureDate",
      "airline",
      "totalFare",
      "travelDuration",
      "flightTime",
      "layoverTime",
      "stops",
      "seatAvailability",
      "confidence",
      "departureTime",
      "arrivalTime",
      "isPredicted",
    ];

    const hasAllKeys = requiredKeys.every((key) => key in flight);
    return hasAllKeys ? flight : null;
  } catch {
    return null;
  }
}

/**
 * Read selected flight from localStorage (set in flightResults.js):
 */
function getStoredFlight() {
  const flightRaw = localStorage.getItem("selectedFlight");
  if (!flightRaw) return null;

  try {
    return JSON.parse(flightRaw);
  } catch {
    return null;
  }
}

/**
 * Read dates from localStorage (set in calendar.js):
 */
function getStoredDates() {
  const depart = localStorage.getItem("departureDate");
  const ret = localStorage.getItem("returnDate");
  return { departure: depart, return: ret };
}

/**
 * Try to inject route, flight, and dates into the Booking page UI.
 * This is defensive: it only updates elements if they exist.
 */
function applyBookingDataToUI(route, flight, dates) {
  const { origin, destination } = route;

  // Update header flight info
  const flightInfo = document.querySelector(".flight-info");
  if (flightInfo && flight) {
    flightInfo.textContent = `${flight.airline} • ${flight.flightNumber}`;
  }

  // Update flight summary
  if (flight) {
    // Departure
    const departureValue = document.querySelector(".flight-detail .detail-value");
    const departureSub = document.querySelector(".flight-detail .detail-sub");
    if (departureValue) departureValue.textContent = flight.departure.time;
    if (departureSub) departureSub.textContent = flight.departure.city;

    // Duration
    const durationValue = document.querySelector(".flight-detail.center .detail-value");
    const durationSub = document.querySelector(".flight-detail.center .detail-sub");
    if (durationValue) durationValue.textContent = flight.duration;
    if (durationSub) durationSub.textContent = flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`;

    // Arrival
    const arrivalValue = document.querySelector(".flight-detail.right .detail-value");
    const arrivalSub = document.querySelector(".flight-detail.right .detail-sub");
    if (arrivalValue) arrivalValue.textContent = flight.arrival.time;
    if (arrivalSub) arrivalSub.textContent = flight.arrival.city;

    // Aircraft
    const aircraftValue = document.querySelector('.info-row .info-value');
    if (aircraftValue) aircraftValue.textContent = flight.aircraft;

    // Travel Date
    const dateValue = document.querySelector('.info-row:last-child .info-value');
    if (dateValue && dates.departure) {
      const date = new Date(dates.departure);
      dateValue.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // If you have a route label somewhere (recommended)
  const routeLabel =
    document.getElementById("routeLabel") ||
    document.querySelector("[data-route-label]");

  if (routeLabel) {
    routeLabel.textContent = `${origin.code} → ${destination.code}`;
  }

  // Common possibilities: inputs or text nodes
  const originTargets = [
    document.getElementById("origin"),
    document.getElementById("originInput"),
    document.querySelector("[data-route-origin]"),
  ].filter(Boolean);

  const destinationTargets = [
    document.getElementById("destination"),
    document.getElementById("destinationInput"),
    document.querySelector("[data-route-destination]"),
  ].filter(Boolean);

  // Fill origin
  originTargets.forEach((el) => {
    if ("value" in el) {
      el.value = origin.name; // show airport name
      el.readOnly = true;
      el.disabled = true; // prevents editing so it stays consistent
    } else {
      el.textContent = origin.name;
    }
  });

  // Fill destination
  destinationTargets.forEach((el) => {
    if ("value" in el) {
      el.value = destination.name;
      el.readOnly = true;
      el.disabled = true;
    } else {
      el.textContent = destination.name;
    }
  });

  // If you have hidden inputs for submitting codes to backend
  const originCodeEl =
    document.getElementById("originCode") ||
    document.querySelector('input[name="originCode"]');

  const destinationCodeEl =
    document.getElementById("destinationCode") ||
    document.querySelector('input[name="destinationCode"]');

  if (originCodeEl) originCodeEl.value = origin.code;
  if (destinationCodeEl) destinationCodeEl.value = destination.code;

  // You can also attach to window for debugging/other scripts
  window.flightSightRoute = route;
  window.flightSightFlight = flight;
  window.flightSightDates = dates;
}

function applySelectedFlightToBookingUI(flight) {
  const flightInfoLabel = document.querySelector(".flight-info");
  if (flightInfoLabel) {
    flightInfoLabel.textContent = `${flight.airline} - ${flight.legId}`;
  }

  const detailValues = document.querySelectorAll(".flight-summary-grid .detail-value");
  const detailSubs = document.querySelectorAll(".flight-summary-grid .detail-sub");

  if (detailValues[0]) detailValues[0].textContent = flight.departureTime || "N/A";
  if (detailValues[1]) detailValues[1].textContent = flight.travelDuration || "N/A";
  if (detailValues[2]) detailValues[2].textContent = flight.arrivalTime || "N/A";

  if (detailSubs[0]) detailSubs[0].textContent = `${flight.origin}`;
  if (detailSubs[1]) detailSubs[1].textContent = Number(flight.stops) === 0 ? "Nonstop" : `${flight.stops} stop(s)`;
  if (detailSubs[2]) detailSubs[2].textContent = `${flight.destination}`;

  const travelDateRows = document.querySelectorAll(".flight-info-details .info-row");
  if (travelDateRows[1]) {
    const valueNode = travelDateRows[1].querySelector(".info-value");
    if (valueNode) valueNode.textContent = flight.departureDate;
  }

  const baseFareNode = document.querySelector(".price-row.base .price-amount");
  if (baseFareNode && typeof flight.totalFare === "number") {
    baseFareNode.textContent = `$${flight.totalFare.toFixed(2)}`;
  }
}

/* ================= ROUTE ENFORCEMENT (NEW) ================= */
document.addEventListener("DOMContentLoaded", () => {
  const selectedFlight = getSelectedFlight();

  if (selectedFlight) {
    applySelectedFlightToBookingUI(selectedFlight);
    window.flightSightSelectedFlight = selectedFlight;
    return;
  }

  const route = getStoredRoute();
  const flight = getStoredFlight();
  const dates = getStoredDates();

  // If someone enters Booking without selecting a route first:
  if (!route) {
    alert("Please select a flight first.");
    window.location.href = "calendar.html";
    return;
  }

  // If someone enters Booking without selecting a flight:
  if (!flight) {
    alert("Please select a flight first.");
    window.location.href = "flightResults.html";
    return;
  }

  applyBookingDataToUI(route, flight, dates);
});

/* ================= EXISTING BOOKING PAGE LOGIC (UNCHANGED) ================= */
async function refreshEmissions() {
  // expects: { co2: 180, airline: "Delta" }  (your server returns similar)
  const selectedFlight = getSelectedFlight();
  const route = getStoredRoute();

  const origin = selectedFlight?.origin || route?.origin?.code || "";
  const destination = selectedFlight?.destination || route?.destination?.code || "";
  const airline = selectedFlight?.airline || "";

  console.log("Selected route:", origin || "N/A", "->", destination || "N/A");

  let emissionsPath = `${API_BASE}/emissions`;
  if (origin && destination) {
    const params = new URLSearchParams({
      origin,
      destination,
    });

    if (airline) {
      params.set("airline", airline);
    }

    emissionsPath = `${API_BASE}/emissions?${params.toString()}`;
  }

  console.log("[FlightSight] Request URL:", emissionsPath);

  let d;
  try {
    const response = await fetch(emissionsPath);
    if (!response.ok) {
      console.error("[FlightSight] Emissions API response error:", {
        url: emissionsPath,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`${emissionsPath} failed: ${response.status} ${response.statusText}`);
    }
    d = await response.json();
  } catch (err) {
    console.error("[FlightSight] Emissions fetch failed:", {
      url: emissionsPath,
      error: err,
    });
    throw err;
  }

  console.log("Emissions API response:", d);

  const co2Big = document.getElementById("co2Big");
  const co2Note = document.getElementById("co2Note");
  if (co2Big) co2Big.textContent = `${d.co2} kg`;
  if (co2Note) {
    const airline = selectedFlight?.airline || d.airline;
    co2Note.textContent = `Airline: ${airline}`;
  }
}

async function refreshSeatWeather() {
  // expects: { seat_status: "Available", weather: "Clear" }
  const d = await getJSON(`${API_BASE}/seatweather`);

  const seatPill = document.getElementById("seatPill");
  const weatherPill = document.getElementById("weatherPill");
  if (seatPill) seatPill.textContent = `Seats: ${d.seat_status}`;
  if (weatherPill) weatherPill.textContent = `Weather: ${d.weather}`;

  // Optional: tweak bar based on text (simple demo logic)
  let pct = 60;
  if (String(d.seat_status).toLowerCase().includes("low")) pct = 25;
  if (String(d.seat_status).toLowerCase().includes("limited")) pct = 35;
  if (String(d.seat_status).toLowerCase().includes("available")) pct = 70;

  const seatBar = document.getElementById("seatBar");
  const seatPct = document.getElementById("seatPct");
  if (seatBar) seatBar.style.width = `${pct}%`;
  if (seatPct) seatPct.textContent = `${pct}%`;
}

async function runAnalysis() {
  // expects something like:
  // { avg_price: 320, cheapest_city: "Dallas", busiest_month: "July" }
  const d = await getJSON(`${API_BASE}/analysis`);

  const analysisJson = document.getElementById("analysisJson");
  if (analysisJson) analysisJson.textContent = JSON.stringify(d, null, 2);

  const kpiAvgPrice = document.getElementById("kpiAvgPrice");
  const kpiCheapestCity = document.getElementById("kpiCheapestCity");
  const kpiBusiestMonth = document.getElementById("kpiBusiestMonth");

  if (kpiAvgPrice) kpiAvgPrice.textContent = d.avg_price != null ? `$${d.avg_price}` : "—";
  if (kpiCheapestCity) kpiCheapestCity.textContent = d.cheapest_city ?? "—";
  if (kpiBusiestMonth) kpiBusiestMonth.textContent = d.busiest_month ?? "—";
}

async function saveSelectedFlight() {
  const selectedFlight = getSelectedFlight();
  if (!selectedFlight) {
    alert("Please select a flight first.");
    return;
  }

  const co2Text = document.getElementById("co2Big")?.textContent?.trim() || null;
  const weatherText = document.getElementById("weatherPill")?.textContent?.trim() || null;

  const payload = {
    selectedFlight: {
      ...selectedFlight,
      emissions: co2Text,
      weather: weatherText,
    },
  };

  const saveUrl = "http://localhost:3000/api/saved-flights";
  console.log("[FlightSight] Save request URL:", saveUrl);
  console.log("[FlightSight] Save request payload:", payload);

  try {
    const response = await fetch(saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    let parsedBody;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      parsedBody = rawBody;
    }

    console.log("[FlightSight] Save response status:", response.status, response.statusText);
    console.log("[FlightSight] Save response body:", parsedBody);

    if (!response.ok) {
      console.error("[FlightSight] Save flight response error:", {
        url: saveUrl,
        status: response.status,
        statusText: response.statusText,
        body: parsedBody,
      });
      alert("Failed to save flight.");
      return;
    }

    alert("Flight saved successfully.");
  } catch (err) {
    console.error("[FlightSight] Save flight request failed:", {
      url: saveUrl,
      error: err,
    });
    alert("Error saving flight.");
  }
}

async function createPriceAlert(threshold = 100) {
  const selectedFlight = getSelectedFlight();
  if (!selectedFlight) {
    alert("Please select a flight first.");
    return;
  }

  const payload = {
    userEmail: localStorage.getItem("userEmail") || "anonymous",
    origin: selectedFlight.origin,
    destination: selectedFlight.destination,
    departureDate: selectedFlight.departureDate,
    airline: selectedFlight.airline,
    stops: selectedFlight.stops,
    currentFare: selectedFlight.totalFare,
    threshold
  };

  try {
    const response = await fetch(`${API_BASE}/api/price-alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const bodyText = await response.text();
    let body = {};
    try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { body = {}; }

    if (response.status === 409) {
      setPriceAlertStatus("A price alert already exists for this route/date/airline.", "warn");
      return;
    }

    if (!response.ok) {
      setPriceAlertStatus(body.error || "Failed to create price alert.", "warn");
      return;
    }

    setPriceAlertStatus(`Price alert created (threshold = $${Number(threshold).toFixed(2)}). We'll watch for price drops.`, "success");
  } catch (err) {
    console.error("[FlightSight] Create price alert failed:", err);
    setPriceAlertStatus("Error creating price alert.", "warn");
  }
}

function setPriceAlertStatus(message, tone) {
  const status = document.getElementById("priceAlertStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("price-alert-status--success", "price-alert-status--warn", "price-alert-status--info");
  if (tone === "success") status.classList.add("price-alert-status--success");
  else if (tone === "warn") status.classList.add("price-alert-status--warn");
  else status.classList.add("price-alert-status--info");
}

async function refreshPriceAlertBaseline() {
  const selectedFlight = getSelectedFlight();
  if (!selectedFlight) {
    setPriceAlertStatus("Set your own threshold to track this trip.", "info");
    return;
  }
  try {
    const userEmail = localStorage.getItem("userEmail") || "anonymous";
    const params = new URLSearchParams({
      userEmail,
      currentFare: String(selectedFlight.totalFare ?? "")
    });
    const r = await fetch(`${API_BASE}/api/price-alerts/evaluate?${params.toString()}`);
    if (!r.ok) throw new Error(`evaluate failed: ${r.status}`);
    const data = await r.json();
    const match = (data.alerts || []).find(a =>
      a.origin === selectedFlight.origin &&
      a.destination === selectedFlight.destination &&
      a.departureDate === selectedFlight.departureDate &&
      a.airline === selectedFlight.airline
    );
    if (match && typeof match.baselineFare === "number" && typeof selectedFlight.totalFare === "number") {
      const diff = selectedFlight.totalFare - match.baselineFare;
      if (diff > 0) {
        setPriceAlertStatus(`Price is above usual by $${diff.toFixed(2)} (baseline $${match.baselineFare.toFixed(2)}).`, "warn");
      } else if (diff < 0) {
        setPriceAlertStatus(`Price is below usual by $${Math.abs(diff).toFixed(2)} (baseline $${match.baselineFare.toFixed(2)}).`, "success");
      } else {
        setPriceAlertStatus(`Price matches baseline ($${match.baselineFare.toFixed(2)}).`, "info");
      }
    } else {
      setPriceAlertStatus("Set your own threshold to track this trip.", "info");
    }
  } catch {
    setPriceAlertStatus("Set your own threshold to track this trip.", "info");
  }
}

function ensurePriceAlertButton() {
  const actionButtons = document.querySelector(".action-buttons");
  if (!actionButtons) return;
  if (document.getElementById("btnPriceAlert")) return;

  // Visible status message (always rendered, with graceful fallback)
  if (!document.getElementById("priceAlertStatus")) {
    const status = document.createElement("div");
    status.id = "priceAlertStatus";
    status.className = "price-alert-status price-alert-status--info";
    status.textContent = "Set your own threshold to track this trip.";
    actionButtons.insertBefore(status, actionButtons.firstChild);
  }

  if (!document.getElementById("priceAlertControls")) {
    const controls = document.createElement("div");
    controls.id = "priceAlertControls";
    controls.style.display = "inline-flex";
    controls.style.alignItems = "center";
    controls.style.gap = "8px";

    const input = document.createElement("input");
    input.id = "priceAlertThreshold";
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.placeholder = "Target price";
    input.setAttribute("aria-label", "Price alert threshold");
    input.style.height = "36px";
    input.style.padding = "0 10px";
    input.style.border = "1px solid #d1d5db";
    input.style.borderRadius = "8px";
    input.style.width = "150px";

    const btn = document.createElement("button");
    btn.id = "btnPriceAlert";
    btn.className = "btn-secondary";
    btn.type = "button";
    btn.textContent = "Set Price Alert";
    btn.addEventListener("click", async () => {
      const threshold = Number(input.value);
      if (!Number.isFinite(threshold) || threshold <= 0) {
        setPriceAlertStatus("Please enter a valid threshold above $0.", "warn");
        return;
      }
      await createPriceAlert(threshold);
      refreshPriceAlertBaseline();
    });

    controls.appendChild(input);
    controls.appendChild(btn);

    const btnSaveFlight = document.querySelector(".btn-primary");
    if (btnSaveFlight && btnSaveFlight.parentNode === actionButtons) {
      actionButtons.insertBefore(controls, btnSaveFlight.nextSibling);
    } else {
      actionButtons.appendChild(controls);
    }
  }

  refreshPriceAlertBaseline();
}

// Button wiring (guarded so it won't crash if an element is missing)
const btnEmissions = document.getElementById("btnEmissions");
const btnSeatWeather = document.getElementById("btnSeatWeather");
const btnAnalysis = document.getElementById("btnAnalysis");
const btnSaveFlight = document.querySelector(".btn-primary");

if (btnEmissions) btnEmissions.addEventListener("click", refreshEmissions);
if (btnSeatWeather) btnSeatWeather.addEventListener("click", refreshSeatWeather);
if (btnAnalysis) btnAnalysis.addEventListener("click", runAnalysis);
if (btnSaveFlight) btnSaveFlight.addEventListener("click", saveSelectedFlight);

ensurePriceAlertButton();

// Auto-load a nice first view (optional)
Promise.allSettled([refreshEmissions(), refreshSeatWeather(), runAnalysis()]);
