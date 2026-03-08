// booking.js

async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

/**
 * Read route from localStorage (set in flightRoute.js):
 * localStorage.setItem("origin", JSON.stringify({code, name}))
 * localStorage.setItem("destination", JSON.stringify({code, name}))
 */
function getStoredRoute() {
  const originRaw = localStorage.getItem("origin");
  const destinationRaw = localStorage.getItem("destination");

  if (!originRaw || !destinationRaw) return null;

  try {
    const origin = JSON.parse(originRaw);
    const destination = JSON.parse(destinationRaw);

    // Basic validation
    if (!origin || !destination) return null;
    if (!origin.code || !origin.name) return null;
    if (!destination.code || !destination.name) return null;

    return { origin, destination };
  } catch {
    return null;
  }
}

/**
 * Try to inject route into the Booking page UI.
 * This is defensive: it only updates elements if they exist.
 */
function applyRouteToBookingUI(route) {
  const { origin, destination } = route;

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
}

/* ================= ROUTE ENFORCEMENT (NEW) ================= */
document.addEventListener("DOMContentLoaded", () => {
  const route = getStoredRoute();

  // If someone enters Booking without selecting a route first:
  if (!route) {
    alert("Please choose your departure and destination airports first.");
    window.location.href = "flightRoute.html";
    return;
  }

  applyRouteToBookingUI(route);
});

/* ================= EXISTING BOOKING PAGE LOGIC (UNCHANGED) ================= */
async function refreshEmissions() {
  // expects: { co2: 180, airline: "Delta" }  (your server returns similar)
  const d = await getJSON("/emissions");
  const co2Big = document.getElementById("co2Big");
  const co2Note = document.getElementById("co2Note");
  if (co2Big) co2Big.textContent = `${d.co2} kg`;
  if (co2Note) co2Note.textContent = `Airline: ${d.airline}`;
}

async function refreshSeatWeather() {
  // expects: { seat_status: "Available", weather: "Clear" }
  const d = await getJSON("/seatweather");

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
  const d = await getJSON("/analysis");

  const analysisJson = document.getElementById("analysisJson");
  if (analysisJson) analysisJson.textContent = JSON.stringify(d, null, 2);

  const kpiAvgPrice = document.getElementById("kpiAvgPrice");
  const kpiCheapestCity = document.getElementById("kpiCheapestCity");
  const kpiBusiestMonth = document.getElementById("kpiBusiestMonth");

  if (kpiAvgPrice) kpiAvgPrice.textContent = d.avg_price != null ? `$${d.avg_price}` : "—";
  if (kpiCheapestCity) kpiCheapestCity.textContent = d.cheapest_city ?? "—";
  if (kpiBusiestMonth) kpiBusiestMonth.textContent = d.busiest_month ?? "—";
}

// Button wiring (guarded so it won't crash if an element is missing)
const btnEmissions = document.getElementById("btnEmissions");
const btnSeatWeather = document.getElementById("btnSeatWeather");
const btnAnalysis = document.getElementById("btnAnalysis");

if (btnEmissions) btnEmissions.addEventListener("click", refreshEmissions);
if (btnSeatWeather) btnSeatWeather.addEventListener("click", refreshSeatWeather);
if (btnAnalysis) btnAnalysis.addEventListener("click", runAnalysis);

// Auto-load a nice first view (optional)
Promise.allSettled([refreshEmissions(), refreshSeatWeather(), runAnalysis()]);