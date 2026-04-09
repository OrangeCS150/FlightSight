<<<<<<< HEAD
const API = "http://localhost:3000";

// Load and display city pair routes in comparison table
async function loadCompareRoutes() {
    try {
        let res = await fetch(`${API}/routes`);
        let routes = await res.json();
        
        let tbody = document.getElementById("compare-routes-body");
        tbody.innerHTML = "";
        
        routes.forEach(route => {
            tbody.innerHTML += `
                <tr data-city-pair-id="route-${route.id}">
                    <td>
                        <input
                            type="checkbox"
                            class="compare-checkbox"
                            data-city-pair-id="route-${route.id}"
                        />
                    </td>
                    <td class="route-label">
                        <span class="route-origin">${route.origin}</span> → 
                        <span class="route-destination">${route.destination}</span>
                    </td>
                    <td class="route-airline">${route.airline}</td>
                    <td class="route-safety-score">${route.safety_score}</td>
                    <td class="route-co2">${route.co2_per_passenger} kg</td>
                    <td class="route-price">$${route.avg_price}</td>
                    <td class="route-ontime">${route.on_time}%</td>
                    <td>
                        <button
                            type="button"
                            class="remove-city-pair-btn"
                            onclick="removeRoute(${route.id})"
                            data-city-pair-id="route-${route.id}"
                            aria-label="Remove ${route.origin} to ${route.destination}"
                        >
                            ✕
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading routes:", error);
    }
}

// Remove a route from comparison
async function removeRoute(id) {
    try {
        await fetch(`${API}/routes/${id}`, { method: "DELETE" });
        loadCompareRoutes();
    } catch (error) {
        console.error("Error removing route:", error);
    }
}

// Compare selected routes
function compareSelected() {
    const checkboxes = document.querySelectorAll(".compare-checkbox:checked");
    
    if (checkboxes.length < 2) {
        alert("Please select at least 2 routes to compare");
        return;
    }
    
    const selectedRoutes = [];
    checkboxes.forEach(checkbox => {
        const row = checkbox.closest("tr");
        const routeData = {
            origin: row.querySelector(".route-origin").textContent,
            destination: row.querySelector(".route-destination").textContent,
            airline: row.querySelector(".route-airline").textContent,
            safety_score: parseFloat(row.querySelector(".route-safety-score").textContent),
            co2: parseFloat(row.querySelector(".route-co2").textContent),
            price: parseFloat(row.querySelector(".route-price").textContent.replace("$", "")),
            ontime: parseFloat(row.querySelector(".route-ontime").textContent)
        };
        selectedRoutes.push(routeData);
    });
    
    displayComparison(selectedRoutes);
}

// Display comparison results
function displayComparison(routes) {
    const metric = document.getElementById("compare-metric-select").value;
    const outputDiv = document.getElementById("compare-output");
    
    let comparisonHTML = '<div class="comparison-results"><h3>Comparison Results</h3>';
    
    routes.forEach(route => {
        let metricValue;
        let metricLabel;
        
        switch(metric) {
            case "safety_score":
                metricValue = route.safety_score;
                metricLabel = "Safety Score";
                break;
            case "co2_per_passenger":
                metricValue = route.co2 + " kg";
                metricLabel = "CO₂ per Passenger";
                break;
            case "avg_price":
                metricValue = "$" + route.price;
                metricLabel = "Average Price";
                break;
            case "on_time":
                metricValue = route.ontime + "%";
                metricLabel = "On-time Performance";
                break;
        }
        
        comparisonHTML += `
            <div class="comparison-card">
                <h4>${route.origin} → ${route.destination}</h4>
                <p><strong>Airline:</strong> ${route.airline}</p>
                <p class="comparison-metric">
                    <strong>${metricLabel}:</strong> ${metricValue}
                </p>
            </div>
        `;
    });
    
    comparisonHTML += '</div>';
    outputDiv.innerHTML = comparisonHTML;
}

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
    loadCompareRoutes();
    
    const compareBtn = document.getElementById("compare-selected-btn");
    if (compareBtn) {
        compareBtn.addEventListener("click", compareSelected);
    }
});
=======
document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "http://localhost:3000";
  const container = document.querySelector("main.container");

  if (!container) return;
  container.innerHTML = "";

  function renderEmptyState() {
    container.innerHTML = `
      <div class="flight-card" style="text-align:center; padding: 24px;">
        <h3>No saved flights yet</h3>
        <p>Save a flight from the Booking page to see it here.</p>
      </div>
    `;
  }

  function renderErrorState() {
    container.innerHTML = `
      <div class="flight-card" style="text-align:center; padding: 24px;">
        <h3>Could not load saved flights</h3>
        <p>Please try again.</p>
      </div>
    `;
  }

  function stopsLabel(stops) {
    if (typeof stops !== "number") return "N/A";
    return stops === 0 ? "Nonstop" : `${stops} stop(s)`;
  }

  function renderFlights(flights) {
    if (!Array.isArray(flights) || flights.length === 0) {
      renderEmptyState();
      return;
    }

    container.innerHTML = "";

    flights.forEach((flight) => {
      const card = document.createElement("div");
      card.className = "flight-card";

      card.innerHTML = `
        <div class="flight-top">
          <div>
            <div class="airline-name">${flight.airline || "Unknown Airline"}</div>
            <div>${flight.origin || "?"} → ${flight.destination || "?"}</div>
          </div>
          <div class="saved-date">Saved ${new Date(flight.createdAt).toLocaleDateString()}</div>
        </div>

        <div class="route">
          <div>
            <div class="city">${flight.origin || "?"}</div>
            <div class="time">${flight.departureTime || "N/A"}</div>
          </div>

          <div class="duration">${flight.travelDuration || "N/A"}</div>

          <div>
            <div class="city">${flight.destination || "?"}</div>
            <div class="time">${flight.arrivalTime || "N/A"}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box seat">
            <strong>Stops</strong><br />
            ${stopsLabel(flight.stops)}
          </div>

          <div class="info-box environmental">
            <strong>Seat Availability</strong><br />
            ${flight.seatAvailability || "Unknown"}
          </div>

          <div class="info-box weather">
            <strong>Confidence</strong><br />
            ${flight.confidence || "Unknown"}
          </div>

          <div class="info-box safety">
            <strong>CO₂ / Weather</strong><br />
            ${flight.emissions || "N/A"}<br />
            ${flight.weather || "N/A"}
          </div>
        </div>

        <div class="actions">
          <div class="price">
            ${typeof flight.totalFare === "number" ? `$${flight.totalFare.toFixed(2)}` : "$---"}
            <span style="font-size: 12px; color: #6b7280">per person</span>
          </div>

          <button class="btn view-btn" data-id="${flight.id}">View</button>
          <button class="btn delete delete-btn" data-id="${flight.id}">Delete</button>
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const flight = flights.find((f) => f.id === id);
        if (!flight) return;

        localStorage.setItem("selectedFlight", JSON.stringify(flight));
        window.location.href = "booking.html";
      });
    });

    container.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id);
        if (!Number.isFinite(id)) return;

        const ok = confirm("Remove this saved flight?");
        if (!ok) return;

        try {
          const url = `${API_BASE}/api/saved-flights/${id}`;
          const response = await fetch(url, { method: "DELETE" });

          if (!response.ok) {
            const text = await response.text();
            console.error("Delete failed:", response.status, text);
            alert("Failed to delete saved flight.");
            return;
          }

          btn.closest(".flight-card")?.remove();
          if (!container.querySelector(".flight-card")) {
            renderEmptyState();
          }
        } catch (err) {
          console.error("Delete request failed:", err);
          alert("Error deleting saved flight.");
        }
      });
    });
  }

  try {
    const url = `${API_BASE}/api/saved-flights`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.error("Load saved flights failed:", response.status, text);
      renderErrorState();
      return;
    }

    const payload = await response.json();
    renderFlights(payload.flights || []);
  } catch (err) {
    console.error("Load saved flights request failed:", err);
    renderErrorState();
  }
});
>>>>>>> main
