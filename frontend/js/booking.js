async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json();
}

async function refreshEmissions() {
  // expects: { co2: 180, airline: "Delta" }  (your server returns similar)
  const d = await getJSON("/emissions");
  document.getElementById("co2Big").textContent = `${d.co2} kg`;
  document.getElementById("co2Note").textContent = `Airline: ${d.airline}`;
}

async function refreshSeatWeather() {
  // expects: { seat_status: "Available", weather: "Clear" }
  const d = await getJSON("/seatweather");

  document.getElementById("seatPill").textContent = `Seats: ${d.seat_status}`;
  document.getElementById("weatherPill").textContent = `Weather: ${d.weather}`;

  // Optional: tweak bar based on text (simple demo logic)
  let pct = 60;
  if (String(d.seat_status).toLowerCase().includes("low")) pct = 25;
  if (String(d.seat_status).toLowerCase().includes("limited")) pct = 35;
  if (String(d.seat_status).toLowerCase().includes("available")) pct = 70;

  document.getElementById("seatBar").style.width = `${pct}%`;
  document.getElementById("seatPct").textContent = `${pct}%`;
}

async function runAnalysis() {
  // expects something like:
  // { avg_price: 320, cheapest_city: "Dallas", busiest_month: "July" }
  const d = await getJSON("/analysis");

  document.getElementById("analysisJson").textContent = JSON.stringify(d, null, 2);
  document.getElementById("kpiAvgPrice").textContent =
    d.avg_price != null ? `$${d.avg_price}` : "—";
  document.getElementById("kpiCheapestCity").textContent =
    d.cheapest_city ?? "—";
  document.getElementById("kpiBusiestMonth").textContent =
    d.busiest_month ?? "—";
}

document.getElementById("btnEmissions").addEventListener("click", refreshEmissions);
document.getElementById("btnSeatWeather").addEventListener("click", refreshSeatWeather);
document.getElementById("btnAnalysis").addEventListener("click", runAnalysis);

// Auto-load a nice first view (optional)
Promise.allSettled([refreshEmissions(), refreshSeatWeather(), runAnalysis()]);
