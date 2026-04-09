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
