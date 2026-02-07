// =========================================================
// FlightSight — Emissions Results Page Logic
// Connects to server endpoints served from the SAME origin
// (Your Express serves static frontend + API on localhost:3000)
// =========================================================

async function getJSON(path) {
  const r = await fetch(path, { headers: { "Accept": "application/json" } });
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function co2Tier(co2Kg) {
  // simple UI tiering — adjust as you like
  const v = Number(co2Kg);
  if (!Number.isFinite(v)) return { label: "—", hint: "No emissions value returned." };

  if (v <= 150) return { label: "Low", hint: "Lower CO₂ compared to typical routes." };
  if (v <= 250) return { label: "Moderate", hint: "Average range for similar distances." };
  return { label: "High", hint: "Higher CO₂ — consider alternate routing or aircraft." };
}

async function refreshEmissions() {
  // expects: { co2: 180, airline: "Delta" }
  const d = await getJSON("/emissions");

  setText("co2Big", `${d.co2} kg`);
  setText("co2Note", `Airline: ${d.airline ?? "—"}`);

  const tier = co2Tier(d.co2);
  setText("co2Tier", tier.label);
  setText("co2Hint", tier.hint);
}

async function refreshSeatWeather() {
  // expects: { seat_status: "Available", weather: "Clear" }
  const d = await getJSON("/seatweather");

  setText("seatPill", `Seats: ${d.seat_status ?? "—"}`);
  setText("weatherPill", `Weather: ${d.weather ?? "—"}`);

  // simple demo logic -> seat availability "percent"
  let pct = 60;
  const s = String(d.seat_status ?? "").toLowerCase();
  if (s.includes("low")) pct = 25;
  if (s.includes("limited")) pct = 35;
  if (s.includes("available")) pct = 70;

  const bar = document.getElementById("seatBar");
  if (bar) bar.style.width = `${pct}%`;
  setText("seatPct", `${pct}%`);
}

async function runAnalysis() {
  // expects: { avg_price: 320, cheapest_city: "Dallas", busiest_month: "July" }
  const d = await getJSON("/analysis");

  setText("analysisJson", JSON.stringify(d, null, 2));
  setText("kpiAvgPrice", d.avg_price != null ? `$${d.avg_price}` : "—");
  setText("kpiCheapestCity", d.cheapest_city ?? "—");
  setText("kpiBusiestMonth", d.busiest_month ?? "—");
}

async function refreshRecommendation() {
  // optional endpoint: { best_airline: "United Airlines" }
  try {
    const d = await getJSON("/recommendation");
    setText("recommendedAirline", d.best_airline ?? "—");
  } catch {
    // If endpoint not present or you don't want it, this fails silently
    setText("recommendedAirline", "—");
  }
}

function wireEvents() {
  const btnEmissions = document.getElementById("btnEmissions");
  const btnSeatWeather = document.getElementById("btnSeatWeather");
  const btnAnalysis = document.getElementById("btnAnalysis");

  if (btnEmissions) btnEmissions.addEventListener("click", () => refreshEmissions().catch(console.error));
  if (btnSeatWeather) btnSeatWeather.addEventListener("click", () => refreshSeatWeather().catch(console.error));
  if (btnAnalysis) btnAnalysis.addEventListener("click", () => runAnalysis().catch(console.error));
}

document.addEventListener("DOMContentLoaded", () => {
  wireEvents();

  // auto-load first view
  Promise.allSettled([
    refreshRecommendation(),
    refreshEmissions(),
    refreshSeatWeather(),
    runAnalysis()
  ]).catch(console.error);
});