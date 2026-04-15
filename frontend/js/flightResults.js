// flightResults.js

// Mock flight data
const MOCK_FLIGHTS = [
  {
    id: 1,
    airline: "United Airlines",
    airlineCode: "UA",
    flightNumber: "UA 1234",
    departure: { time: "08:30", city: "New York (JFK)", code: "JFK" },
    arrival: { time: "14:15", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "5h 45m",
    stops: 0,
    price: 320,
    aircraft: "Boeing 737-800",
    safetyRating: 79,
    emissionScore: 85,
    seatAvailability: 68
  },
  {
    id: 2,
    airline: "Delta Air Lines",
    airlineCode: "DL",
    flightNumber: "DL 5678",
    departure: { time: "10:15", city: "New York (JFK)", code: "JFK" },
    arrival: { time: "16:45", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "6h 30m",
    stops: 0,
    price: 345,
    aircraft: "Airbus A320",
    safetyRating: 82,
    emissionScore: 78,
    seatAvailability: 72
  },
  {
    id: 3,
    airline: "American Airlines",
    airlineCode: "AA",
    flightNumber: "AA 9012",
    departure: { time: "12:00", city: "New York (JFK)", code: "JFK" },
    arrival: { time: "15:30", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "3h 30m",
    stops: 1,
    price: 280,
    aircraft: "Boeing 777",
    safetyRating: 76,
    emissionScore: 82,
    seatAvailability: 55
  },
  {
    id: 4,
    airline: "JetBlue Airways",
    airlineCode: "B6",
    flightNumber: "B6 3456",
    departure: { time: "14:20", city: "New York (JFK)", code: "JFK" },
    arrival: { time: "18:10", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "3h 50m",
    stops: 1,
    price: 295,
    aircraft: "Airbus A321",
    safetyRating: 88,
    emissionScore: 75,
    seatAvailability: 80
  },
  {
    id: 5,
    airline: "Alaska Airlines",
    airlineCode: "AS",
    flightNumber: "AS 7890",
    departure: { time: "16:45", city: "New York (JFK)", code: "JFK" },
    arrival: { time: "20:15", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "3h 30m",
    stops: 2,
    price: 265,
    aircraft: "Boeing 737 MAX",
    safetyRating: 91,
    emissionScore: 70,
    seatAvailability: 65
  }
];

let currentFlights = [...MOCK_FLIGHTS];
let filteredFlights = [...MOCK_FLIGHTS];

// Get route from localStorage
function getStoredRoute() {
  const originRaw = localStorage.getItem("origin");
  const destinationRaw = localStorage.getItem("destination");

  if (!originRaw || !destinationRaw) return null;

  try {
    const origin = JSON.parse(originRaw);
    const destination = JSON.parse(destinationRaw);
    return { origin, destination };
  } catch {
    return null;
  }
}

// Get dates from localStorage
function getStoredDates() {
  const depart = localStorage.getItem("departureDate");
  const ret = localStorage.getItem("returnDate");
  return { departure: depart, return: ret };
}

// Update route label
function updateRouteLabel() {
  const route = getStoredRoute();
  const routeLabel = document.getElementById("routeLabel");
  if (route && routeLabel) {
    routeLabel.textContent = `${route.origin.code} → ${route.destination.code}`;
  }
}

// Render flight card
function renderFlightCard(flight) {
  return `
    <div class="flight-card" data-flight-id="${flight.id}">
      <div class="flight-header">
        <div class="flight-airline">
          <div class="airline-logo">${flight.airlineCode}</div>
          <div>
            <div class="airline-name">${flight.airline}</div>
            <div class="flight-number">${flight.flightNumber}</div>
          </div>
        </div>
        <div class="flight-price">
          <div class="price-amount">$${flight.price}</div>
          <div class="price-label">per person</div>
        </div>
      </div>

      <div class="flight-details">
        <div class="flight-departure">
          <div class="flight-time">${flight.departure.time}</div>
          <div class="flight-city">${flight.departure.city}</div>
        </div>
        <div class="flight-duration">
          <div class="duration-time">${flight.duration}</div>
          <div class="duration-label">${flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
        </div>
        <div class="flight-arrival">
          <div class="flight-time">${flight.arrival.time}</div>
          <div class="flight-city">${flight.arrival.city}</div>
        </div>
      </div>

      <div class="flight-meta">
        <div class="flight-stops">
          <span>Aircraft: ${flight.aircraft}</span>
        </div>
        <div class="flight-actions">
          <button class="btn-details" onclick="showFlightDetails(${flight.id})">Details</button>
          <button class="btn-select" onclick="selectFlight(${flight.id})">Select Flight</button>
        </div>
      </div>
    </div>
  `;
}

// Render all flights
function renderFlights(flights) {
  const flightsList = document.getElementById("flightsList");
  flightsList.innerHTML = flights.map(renderFlightCard).join("");
  updateResultsCount(flights.length);
}

// Update results count
function updateResultsCount(count) {
  const resultsCount = document.getElementById("resultsCount");
  resultsCount.textContent = `${count} flight${count !== 1 ? 's' : ''} found`;
}

// Sort flights
function sortFlights(flights, sortBy) {
  const sorted = [...flights];
  switch (sortBy) {
    case "price":
      return sorted.sort((a, b) => a.price - b.price);
    case "duration":
      return sorted.sort((a, b) => {
        const aMinutes = parseDuration(a.duration);
        const bMinutes = parseDuration(b.duration);
        return aMinutes - bMinutes;
      });
    case "departure":
      return sorted.sort((a, b) => a.departure.time.localeCompare(b.departure.time));
    default:
      return sorted;
  }
}

function parseDuration(duration) {
  const match = duration.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}

// Filter flights
function filterFlights() {
  const minPrice = parseFloat(document.getElementById("minPrice").value) || 0;
  const maxPrice = parseFloat(document.getElementById("maxPrice").value) || Infinity;

  const stopCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"][value]');
  const allowedStops = Array.from(stopCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => parseInt(cb.value));

  filteredFlights = MOCK_FLIGHTS.filter(flight => {
    if (flight.price < minPrice || flight.price > maxPrice) return false;
    if (!allowedStops.includes(flight.stops)) return false;
    return true;
  });

  const sortBy = document.getElementById("sortSelect").value;
  currentFlights = sortFlights(filteredFlights, sortBy);
  renderFlights(currentFlights);
}

// Populate airline filters
function populateAirlineFilters() {
  const airlines = [...new Set(MOCK_FLIGHTS.map(f => f.airline))];
  const airlineFilters = document.getElementById("airlineFilters");

  airlineFilters.innerHTML = airlines.map(airline => `
    <label><input type="checkbox" value="${airline}" checked> ${airline}</label>
  `).join("");
}

// Select flight
function selectFlight(flightId) {
  const flight = MOCK_FLIGHTS.find(f => f.id === flightId);
  if (flight) {
    localStorage.setItem("selectedFlight", JSON.stringify(flight));
    window.location.href = "Booking.html";
  }
}

// Show flight details (placeholder)
function showFlightDetails(flightId) {
  const flight = MOCK_FLIGHTS.find(f => f.id === flightId);
  if (flight) {
    alert(`Flight Details:\n${flight.airline} ${flight.flightNumber}\n${flight.departure.time} - ${flight.arrival.time}\nDuration: ${flight.duration}\nPrice: $${flight.price}`);
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const route = getStoredRoute();
  if (!route) {
    alert("Please select your route first.");
    window.location.href = "flightRoute.html";
    return;
  }

  updateRouteLabel();
  populateAirlineFilters();

  // Initial render
  const sortBy = document.getElementById("sortSelect").value;
  currentFlights = sortFlights(MOCK_FLIGHTS, sortBy);
  renderFlights(currentFlights);

  // Event listeners
  document.getElementById("sortSelect").addEventListener("change", () => {
    currentFlights = sortFlights(filteredFlights, document.getElementById("sortSelect").value);
    renderFlights(currentFlights);
  });

  document.getElementById("applyFilters").addEventListener("click", filterFlights);
  document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("minPrice").value = "";
    document.getElementById("maxPrice").value = "";
    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = true);
    filterFlights();
  });

  // Initialize recommendation module
  if (window.RecommendationModule) {
    window.RecommendationModule.initRecommendationUI();
  }
});