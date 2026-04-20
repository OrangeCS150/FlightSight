// flightResults.js

// Mock flight data
const MOCK_FLIGHTS = [
  {
    id: 1,
    airline: "United Airlines",
    airlineCode: "UA",
    flightNumber: "UA 1234",
    departure: { time: "08:30", city: "New York (JFK)", code: "JFK", date: "2023-10-01" },
    arrival: { time: "14:15", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "5h 45m",
    stops: 0,
    price: 320,
    aircraft: "Boeing 737-800",
    safetyRating: 79,
    emissionScore: 85,
    seatAvailability: 68,
    ancillaries: {
      extraBaggage: { name: "Extra Baggage (20kg)", cost: 50 },
      seatSelection: { name: "Preferred Seat", cost: 30 },
      priorityBoarding: { name: "Priority Boarding", cost: 25 }
    }
  },
  {
    id: 2,
    airline: "Delta Air Lines",
    airlineCode: "DL",
    flightNumber: "DL 5678",
    departure: { time: "10:15", city: "New York (JFK)", code: "JFK", date: "2023-10-02" },
    arrival: { time: "16:45", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "6h 30m",
    stops: 0,
    price: 345,
    aircraft: "Airbus A320",
    safetyRating: 82,
    emissionScore: 78,
    seatAvailability: 72,
    ancillaries: {
      extraBaggage: { name: "Extra Baggage (20kg)", cost: 55 },
      seatSelection: { name: "Extra Legroom Seat", cost: 40 }
    }
  },
  {
    id: 3,
    airline: "American Airlines",
    airlineCode: "AA",
    flightNumber: "AA 9012",
    departure: { time: "12:00", city: "New York (JFK)", code: "JFK", date: "2023-10-03" },
    arrival: { time: "15:30", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "3h 30m",
    stops: 1,
    price: 280,
    aircraft: "Boeing 777",
    safetyRating: 76,
    emissionScore: 82,
    seatAvailability: 55,
    ancillaries: {
      priorityBoarding: { name: "Priority Boarding", cost: 20 }
    }
  },
  {
    id: 4,
    airline: "JetBlue Airways",
    airlineCode: "B6",
    flightNumber: "B6 3456",
    departure: { time: "14:20", city: "New York (JFK)", code: "JFK", date: "2023-10-04" },
    arrival: { time: "18:10", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "3h 50m",
    stops: 1,
    price: 295,
    aircraft: "Airbus A321",
    safetyRating: 88,
    emissionScore: 75,
    seatAvailability: 80,
    ancillaries: {}
  },
  {
    id: 5,
    airline: "Alaska Airlines",
    airlineCode: "AS",
    flightNumber: "AS 7890",
    departure: { time: "16:45", city: "New York (JFK)", code: "JFK", date: "2023-10-05" },
    arrival: { time: "20:15", city: "Los Angeles (LAX)", code: "LAX" },
    duration: "3h 30m",
    stops: 2,
    price: 265,
    aircraft: "Boeing 737 MAX",
    safetyRating: 91,
    emissionScore: 70,
    seatAvailability: 65,
    ancillaries: {
      extraBaggage: { name: "Extra Baggage (20kg)", cost: 45 },
      seatSelection: { name: "Preferred Seat", cost: 35 },
      priorityBoarding: { name: "Priority Boarding", cost: 30 }
    }
  }
];

let currentFlights = [...MOCK_FLIGHTS];
let filteredFlights = [...MOCK_FLIGHTS];
let selectedForComparison = [];

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

// Render flight card (updated with checkbox)
function renderFlightCard(flight) {
  const isSelected = selectedForComparison.includes(flight.id);
  return `
    <div class="flight-card" data-flight-id="${flight.id}">
      <div class="flight-header">
        <div class="flight-airline">
          <input type="checkbox" class="compare-checkbox" data-flight-id="${flight.id}" ${isSelected ? 'checked' : ''} onchange="toggleComparison(${flight.id})">
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

// Show flight details (expanded with ancillaries)
function showFlightDetails(flightId) {
  const flight = MOCK_FLIGHTS.find(f => f.id === flightId);
  if (flight) {
    let details = `Flight Details:\n${flight.airline} ${flight.flightNumber}\n${flight.departure.time} - ${flight.arrival.time}\nDuration: ${flight.duration}\nPrice: $${flight.price}`;
    if (Object.keys(flight.ancillaries).length > 0) {
      details += '\n\nAdditional Options:';
      Object.values(flight.ancillaries).forEach(option => {
        details += `\n- ${option.name}: $${option.cost}`;
      });
    }
    alert(details);
  }
}

// Load Additional Options
function loadAdditionalOptions() {
  const section = document.getElementById('additionalOptionsSection');
  const loading = document.getElementById('optionsLoading');
  const error = document.getElementById('optionsError');
  const empty = document.getElementById('optionsEmpty');
  const list = document.getElementById('optionsList');

  // Show loading
  loading.style.display = 'block';
  error.style.display = 'none';
  empty.style.display = 'none';
  list.style.display = 'none';

  try {
    // Simulate async load
    setTimeout(() => {
      const options = prepareAdditionalOptions(currentFlights);
      if (options.length === 0) {
        empty.style.display = 'block';
        loading.style.display = 'none';
        return;
      }
      renderAdditionalOptions(options);
      loading.style.display = 'none';
      list.style.display = 'block';
    }, 500);
  } catch (err) {
    console.error('Error loading additional options:', err);
    error.style.display = 'block';
    loading.style.display = 'none';
  }
}

// Prepare options: aggregate ancillaries from flights
function prepareAdditionalOptions(flights) {
  const allOptions = {};
  flights.forEach(flight => {
    Object.entries(flight.ancillaries).forEach(([key, option]) => {
      if (!allOptions[key]) {
        allOptions[key] = { 
          name: option.name, 
          costs: [],
          minCost: option.cost,
          maxCost: option.cost
        };
      }
      allOptions[key].costs.push(option.cost);
      allOptions[key].minCost = Math.min(allOptions[key].minCost, option.cost);
      allOptions[key].maxCost = Math.max(allOptions[key].maxCost, option.cost);
    });
  });
  return Object.entries(allOptions).map(([key, data]) => ({
    key,
    name: data.name,
    avgCost: data.costs.reduce((a, b) => a + b, 0) / data.costs.length,
    minCost: data.minCost,
    maxCost: data.maxCost,
    count: data.costs.length
  })).sort((a, b) => a.avgCost - b.avgCost);
}

// Render Additional Options
function renderAdditionalOptions(options) {
  const breakdown = document.getElementById('optionsBreakdown');
  breakdown.innerHTML = '';
  
  options.forEach(option => {
    const item = document.createElement('div');
    item.className = 'option-item';
    const priceRange = option.minCost === option.maxCost 
      ? `$${option.avgCost.toFixed(2)}` 
      : `$${option.minCost.toFixed(2)} - $${option.maxCost.toFixed(2)}`;
    item.innerHTML = `
      <div class="option-checkbox-row">
        <label>
          <input type="checkbox" data-cost="${option.avgCost}" onchange="updateTotal()"> 
          <span class="option-name">${option.name}</span>
        </label>
      </div>
      <div class="option-price-detail">
        <span class="price-range">${priceRange}</span>
        <span class="price-note">${option.count} flight${option.count !== 1 ? 's' : ''}</span>
      </div>
    `;
    breakdown.appendChild(item);
  });
  updateTotal();
}

// Update Total Cost
function updateTotal() {
  const checkboxes = document.querySelectorAll('#optionsBreakdown input[type="checkbox"]');
  let total = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const cost = parseFloat(cb.getAttribute('data-cost'));
      total += cost;
    }
  });
  const totalEl = document.getElementById('totalCost');
  if (totalEl) {
    totalEl.textContent = `$${total.toFixed(2)}`;
  }
}

// Load Date vs Cost Analysis
function loadDateVsCost() {
  const section = document.getElementById('dateVsCostSection');
  const loading = document.getElementById('dateVsCostLoading');
  const error = document.getElementById('dateVsCostError');
  const empty = document.getElementById('dateVsCostEmpty');
  const trend = document.getElementById('trendVisualization');
  const comparison = document.getElementById('comparisonVisualization');
  const table = document.getElementById('detailedTable');

  // Show loading
  loading.style.display = 'block';
  error.style.display = 'none';
  empty.style.display = 'none';
  trend.style.display = 'none';
  comparison.style.display = 'none';
  table.style.display = 'none';

  try {
    // Simulate async load (replace with real API if needed)
    setTimeout(() => {
      const data = prepareDateVsCostData(currentFlights);
      if (data.length === 0) {
        empty.style.display = 'block';
        loading.style.display = 'none';
        return;
      }
      renderTrendChart(data);
      renderComparisonChart(data);
      renderDetailedTable(data);
      loading.style.display = 'none';
      trend.style.display = 'block';
      comparison.style.display = 'block';
      table.style.display = 'block';
    }, 500);
  } catch (err) {
    console.error('Error loading Date vs Cost:', err);
    error.style.display = 'block';
    loading.style.display = 'none';
  }
}

// Prepare data: group by date, calculate averages
function prepareDateVsCostData(flights) {
  const grouped = {};
  flights.forEach(flight => {
    const date = flight.departure.date;
    if (!grouped[date]) grouped[date] = { costs: [], airlines: [], stops: [] };
    grouped[date].costs.push(flight.price);
    grouped[date].airlines.push(flight.airline);
    grouped[date].stops.push(flight.stops);
  });
  return Object.entries(grouped).map(([date, data]) => ({
    date,
    avgCost: data.costs.reduce((a, b) => a + b, 0) / data.costs.length,
    minCost: Math.min(...data.costs),
    maxCost: Math.max(...data.costs),
    flights: data.costs.length,
    airlines: data.airlines,
    stops: data.stops
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Render Trend Chart (simple bar chart using divs)
function renderTrendChart(data) {
  const chart = document.getElementById('trendChart');
  chart.innerHTML = '';
  const maxCost = Math.max(...data.map(d => d.avgCost));
  data.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${(d.avgCost / maxCost) * 100}%`;
    bar.title = `${new Date(d.date).toLocaleDateString()}: $${d.avgCost.toFixed(2)}`;
    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = new Date(d.date).toLocaleDateString();
    bar.appendChild(label);
    chart.appendChild(bar);
  });
}

// Render Comparison Chart (by period, e.g., weekday vs weekend)
function renderComparisonChart(data) {
  const chart = document.getElementById('comparisonChart');
  chart.innerHTML = '';
  const periods = { weekday: [], weekend: [] };
  data.forEach(d => {
    const day = new Date(d.date).getDay();
    if (day === 0 || day === 6) periods.weekend.push(d.avgCost);
    else periods.weekday.push(d.avgCost);
  });
  const avgWeekday = periods.weekday.reduce((a, b) => a + b, 0) / periods.weekday.length || 0;
  const avgWeekend = periods.weekend.reduce((a, b) => a + b, 0) / periods.weekend.length || 0;
  const maxAvg = Math.max(avgWeekday, avgWeekend);
  ['Weekday', 'Weekend'].forEach((period, i) => {
    const avg = i === 0 ? avgWeekday : avgWeekend;
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${(avg / maxAvg) * 100}%`;
    bar.title = `${period}: $${avg.toFixed(2)}`;
    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = period;
    bar.appendChild(label);
    chart.appendChild(bar);
  });
}

// Render Detailed Table
function renderDetailedTable(data) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  data.forEach(d => {
    d.airlines.forEach((airline, i) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(d.date).toLocaleDateString()}</td>
        <td>$${d.costs[i].toFixed(2)}</td>
        <td>${airline}</td>
        <td>${d.stops[i]}</td>
      `;
      tbody.appendChild(row);
    });
  });
}

// Toggle comparison selection
function toggleComparison(flightId) {
  const index = selectedForComparison.indexOf(flightId);
  if (index > -1) {
    selectedForComparison.splice(index, 1);
  } else if (selectedForComparison.length < 2) {
    selectedForComparison.push(flightId);
  } else {
    alert('You can only compare up to 2 airlines.');
    document.querySelector(`[data-flight-id="${flightId}"] .compare-checkbox`).checked = false;
    return;
  }
  renderFlights(currentFlights);
  updateCompareButton();
}

// Update compare button visibility
function updateCompareButton() {
  let btn = document.getElementById('compareBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'compareBtn';
    btn.className = 'btn-primary';
    btn.textContent = 'Compare Selected';
    btn.onclick = loadComparison;
    document.querySelector('.sort-bar').appendChild(btn);
  }
  btn.style.display = selectedForComparison.length === 2 ? 'inline-block' : 'none';
}

// Load Comparison
function loadComparison() {
  const section = document.getElementById('comparisonSection');
  const loading = document.getElementById('comparisonLoading');
  const error = document.getElementById('comparisonError');
  const empty = document.getElementById('comparisonEmpty');
  const layout = document.getElementById('comparisonLayout');

  section.style.display = 'block';
  loading.style.display = 'block';
  error.style.display = 'none';
  empty.style.display = 'none';
  layout.style.display = 'none';

  try {
    setTimeout(() => {
      const flights = selectedForComparison.map(id => MOCK_FLIGHTS.find(f => f.id === id)).filter(Boolean);
      if (flights.length !== 2) {
        empty.style.display = 'block';
        loading.style.display = 'none';
        return;
      }
      renderComparison(flights);
      loading.style.display = 'none';
      layout.style.display = 'grid';
    }, 500);
  } catch (err) {
    console.error('Error loading comparison:', err);
    error.style.display = 'block';
    loading.style.display = 'none';
  }
}

// Render Comparison
function renderComparison(flights) {
  const left = document.getElementById('comparisonLeft');
  const right = document.getElementById('comparisonRight');
  [left, right].forEach((col, i) => {
    const flight = flights[i];
    col.innerHTML = `
      <h4>${flight.airline}</h4>
      <p><strong>Total Price:</strong> $${flight.price}</p>
      <p><strong>Duration:</strong> ${flight.duration}</p>
      <p><strong>Stops:</strong> ${flight.stops}</p>
      <p><strong>Extra Baggage:</strong> $${flight.ancillaries.extraBaggage?.cost || 0}</p>
      <p><strong>Seat Selection:</strong> $${flight.ancillaries.seatSelection?.cost || 0}</p>
      <p><strong>Priority Boarding:</strong> $${flight.ancillaries.priorityBoarding?.cost || 0}</p>
    `;
  });
}

// Hide Comparison
function hideComparison() {
  document.getElementById('comparisonSection').style.display = 'none';
  resetComparison();
}

// Reset Comparisons
function resetComparison() {
  selectedForComparison = [];
  document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
  renderFlights(currentFlights);
  updateCompareButton();
}

// =================== Recommendation System ===================

// Calculate recommendation score using rule-based approach
function calculateRecommendationScore(flight) {
  let score = 0;
  let weights = {
    price: 0.25,
    safety: 0.30,
    emissions: 0.20,
    stops: 0.15,
    availability: 0.10
  };

  // Price score (lower is better, inverse relationship)
  const maxPrice = Math.max(...MOCK_FLIGHTS.map(f => f.price));
  const priceScore = 100 * (1 - (flight.price / maxPrice));
  score += priceScore * weights.price;

  // Safety score (higher is better)
  score += flight.safetyRating * weights.safety;

  // Emissions score (higher is better - lower emissions)
  score += flight.emissionScore * weights.emissions;

  // Stops score (fewer is better)
  const stopScore = Math.max(0, 100 - (flight.stops * 25));
  score += stopScore * weights.stops;

  // Seat availability score (higher is better)
  score += flight.seatAvailability * weights.availability;

  return Math.round(score * 10) / 10;
}

// Get best airline recommendation
function getRecommendedAirline() {
  if (!MOCK_FLIGHTS || MOCK_FLIGHTS.length === 0) return null;
  
  const scored = MOCK_FLIGHTS.map(flight => ({
    ...flight,
    score: calculateRecommendationScore(flight)
  })).sort((a, b) => b.score - a.score);

  return scored[0];
}

// Display recommendation
function displayRecommendation() {
  const recommended = getRecommendedAirline();
  if (!recommended) return;

  const recPanel = document.getElementById('recommendationPanel');
  if (!recPanel || !recPanel.innerHTML) return;

  const recSection = recPanel.querySelector('.rec-section');
  if (recSection) {
    recSection.innerHTML = `
      <div class="recommendation-card">
        <div class="rec-header">
          <h4>Recommended Airline</h4>
          <span class="rec-score">${recommended.score.toFixed(1)}/100</span>
        </div>
        <div class="rec-airline">
          <div class="rec-airline-name">${recommended.airline}</div>
          <div class="rec-airline-code">${recommended.airlineCode}</div>
        </div>
        <div class="rec-stats">
          <div class="rec-stat">
            <span class="stat-label">Price</span>
            <span class="stat-value">$${recommended.price}</span>
          </div>
          <div class="rec-stat">
            <span class="stat-label">Safety</span>
            <span class="stat-value">${recommended.safetyRating}%</span>
          </div>
          <div class="rec-stat">
            <span class="stat-label">Emissions</span>
            <span class="stat-value">${recommended.emissionScore}</span>
          </div>
          <div class="rec-stat">
            <span class="stat-label">Stops</span>
            <span class="stat-value">${recommended.stops}</span>
          </div>
        </div>
        <button class="btn-primary" onclick="selectFlight(${recommended.id})">Book This Flight</button>
      </div>
    `;
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
  
  // Display recommendation
  displayRecommendation();

  updateCompareButton();
});