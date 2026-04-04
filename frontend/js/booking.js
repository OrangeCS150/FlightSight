// ================= DATA MODEL =================
const bookingData = {
  airline: "Delta Airlines",

  departure: {
    code: "LAX",
    time: "8:30 AM"
  },

  arrival: {
    code: "JFK",
    time: "4:50 PM"
  },

  duration: "5h 20m",
  stops: "Non-stop",

  date: "July 15, 2026",
  day: "Tuesday",

  seatFill: 78,

  weather: {
    departure: { temp: "75°F", condition: "Sunny" },
    arrival: { temp: "68°F", condition: "Partly Cloudy" }
  },

  safety: 87,
  co2: "1,240 kg"
};

// ================= RENDER =================
function renderBooking(data) {
  document.getElementById("airlineName").textContent = data.airline;

  document.getElementById("departureCode").textContent = data.departure.code;
  document.getElementById("departureTime").textContent = data.departure.time;

  document.getElementById("arrivalCode").textContent = data.arrival.code;
  document.getElementById("arrivalTime").textContent = data.arrival.time;

  document.getElementById("duration").textContent = data.duration;
  document.getElementById("stops").textContent = data.stops;

  document.getElementById("date").textContent = data.date;
  document.getElementById("day").textContent = data.day;

  document.getElementById("seatFillText").textContent = data.seatFill;
  document.getElementById("seatFillBar").style.width = data.seatFill + "%";

  document.getElementById("depWeatherCode").textContent = data.departure.code;
  document.getElementById("arrWeatherCode").textContent = data.arrival.code;

  document.getElementById("depTemp").textContent = data.weather.departure.temp;
  document.getElementById("depCondition").textContent = data.weather.departure.condition;

  document.getElementById("arrTemp").textContent = data.weather.arrival.temp;
  document.getElementById("arrCondition").textContent = data.weather.arrival.condition;

  document.getElementById("safetyText").textContent = data.safety;
  document.getElementById("safetyBar").style.width = data.safety + "%";

  document.getElementById("co2Text").textContent = data.co2;
}

// ================= PRICE LOGIC =================
function formatUSD(n) {
  return "$" + n.toFixed(0);
}

function updatePrice(total, seatName) {
  const TAX_RATE = 0.06;
  const MIN_TAX = 20;

  const taxes = Math.max(MIN_TAX, Math.round(total * TAX_RATE));
  const base = total - taxes;

  document.getElementById("seatClassLabel").textContent = seatName;
  document.getElementById("baseFare").textContent = formatUSD(base);
  document.getElementById("taxesFees").textContent = formatUSD(taxes);
  document.getElementById("totalPrice").textContent = formatUSD(total);
}

// ================= ROUTE SYNC =================
function applyRoute() {
  const origin = JSON.parse(localStorage.getItem("origin") || "null");
  const destination = JSON.parse(localStorage.getItem("destination") || "null");

  if (!origin || !destination) {
    alert("Select route first.");
    window.location.href = "flightRoute.html";
    return;
  }

  bookingData.departure.code = origin.code;
  bookingData.arrival.code = destination.code;
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

  applyRoute();
  renderBooking(bookingData);

  // Seat buttons
  const buttons = document.querySelectorAll(".seat-option");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {

      buttons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      const price = Number(btn.dataset.price);
      const seat = btn.dataset.seat;

      updatePrice(price, seat);
    });
  });

  // Default
  updatePrice(320, "Economy");
});