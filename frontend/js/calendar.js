document.addEventListener("DOMContentLoaded", () => {
  const roundTripBtn = document.getElementById("roundTrip");
  const oneWayBtn = document.getElementById("oneWay");
  const searchFlightBtn = document.getElementById("searchFlights");
  const routeDisplay = document.getElementById("selectedRoute");
  const calendarContainer = document.getElementById("calendarContainer");
  const resultsContainer = document.getElementById("flightResults");

  let tripType = "round";

  function getStoredRoute() {
    try {
      const origin = JSON.parse(localStorage.getItem("origin") || "null");
      const destination = JSON.parse(localStorage.getItem("destination") || "null");
      if (!origin?.code || !destination?.code) return null;
      return { origin, destination };
    } catch {
      return null;
    }
  }

  function toYmd(isoString) {
    if (!isoString) return "";
    return new Date(isoString).toISOString().slice(0, 10);
  }

  function formatFare(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
    return `$${value.toFixed(2)}`;
  }

  function renderMessage(title, message) {
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="card info-box">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    `;
  }

  function renderFlights(flights) {
    if (!resultsContainer) return;

    if (!flights.length) {
      renderMessage("No matching flights found.", "Try a different date or route.");
      return;
    }

    const cardsHtml = flights
      .map(
        (flight) => `
          <div class="card flight-result-card" data-leg-id="${flight.legId}">
            <h3>${flight.airline || "Unknown Airline"}</h3>
            <p><strong>${flight.origin} -> ${flight.destination}</strong> | ${flight.departureDate}</p>
            <p>Departure: ${flight.departureTime || "N/A"}</p>
            <p>Arrival: ${flight.arrivalTime || "N/A"}</p>
            <p>Duration: ${flight.travelDuration || "N/A"}</p>
            <p>Stops: ${typeof flight.stops === "number" ? (flight.stops === 0 ? "Nonstop" : `${flight.stops} stop(s)`) : "N/A"}</p>
            <p><strong>${formatFare(flight.totalFare)}</strong></p>
            <button class="continue-btn select-flight-btn" data-leg-id="${flight.legId}">Select Flight</button>
          </div>
        `
      )
      .join("");

    resultsContainer.innerHTML = `
      <div class="card">
        <h3>Available Flights</h3>
        <p class="muted">Choose one flight to continue to booking.</p>
        <div class="flight-results-grid">${cardsHtml}</div>
      </div>
    `;

    resultsContainer.querySelectorAll(".select-flight-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const selectedFlight = flights.find((f) => f.legId === btn.dataset.legId);
        if (!selectedFlight) return;

        localStorage.setItem("selectedFlight", JSON.stringify(selectedFlight));
        window.location.href = "booking.html";
      });
    });
  }

  async function searchFlightsForSelectedDate() {
    const route = getStoredRoute();
    const depart = localStorage.getItem("departureDate");
    const ret = localStorage.getItem("returnDate");

    if (!route) {
      renderMessage("Missing route.", "Please choose origin and destination first.");
      return;
    }

    if (!depart) {
      renderMessage("Missing departure date.", "Please select a departure date.");
      return;
    }

    if (tripType === "round" && !ret) {
      renderMessage("Missing return date.", "Please select a return date.");
      return;
    }

    const departureDate = toYmd(depart);

    searchFlightBtn.disabled = true;
    searchFlightBtn.textContent = "Searching flights...";
    renderMessage("Searching flights...", "Please wait while we load predicted flight options.");

    try {
      const params = new URLSearchParams({
        origin: route.origin.code,
        destination: route.destination.code,
        departureDate,
        limit: "30",
      });

      const requestUrl = `http://localhost:3000/api/flights/predict?${params.toString()}`;
      console.log("[FlightSight] Fetching predicted flights:", requestUrl);

      const response = await fetch(requestUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[FlightSight] Flight prediction response error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Flight prediction failed: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json();
      renderFlights(payload.flights || []);
    } catch (err) {
      console.error("[FlightSight] Flight search fetch error:", err);
      renderMessage("Could not load flights.", "Please try again.");
    } finally {
      searchFlightBtn.disabled = false;
      searchFlightBtn.textContent = "Search Flights";
    }
  }

  const route = getStoredRoute();
  if (route && routeDisplay) {
    routeDisplay.value = `${route.origin.code} -> ${route.destination.code}`;
  }

  if (calendarContainer && typeof flatpickr !== "undefined") {
    const fp = flatpickr(calendarContainer, {
      mode: tripType === "round" ? "range" : "single",
      minDate: "today",
      dateFormat: "M d, Y",
      inline: true,
      allowInput: false,
      showMonths: window.innerWidth < 768 ? 1 : 2,
      onReady(selectedDates, dateStr, instance) {
        scaleFlatpickr(instance);
        window.addEventListener("resize", () => scaleFlatpickr(instance));
      },
      onChange(selectedDates) {
        if (tripType === "one" && selectedDates.length >= 1) {
          localStorage.setItem("departureDate", selectedDates[0].toISOString());
          localStorage.removeItem("returnDate");
        }

        if (tripType === "round" && selectedDates.length === 2) {
          localStorage.setItem("departureDate", selectedDates[0].toISOString());
          localStorage.setItem("returnDate", selectedDates[1].toISOString());
        }

        updateSearchButton();
      },
    });

    function scaleFlatpickr(instance, padding = 40) {
      const rightSection = document.querySelector(".calendar-right-section");
      const calendar = instance.calendarContainer;
      if (!rightSection || !calendar) return;

      requestAnimationFrame(() => {
        calendar.style.transform = "";
        const containerWidth = rightSection.clientWidth - padding * 2;
        const calendarWidth = calendar.offsetWidth;
        const scale = containerWidth / calendarWidth;
        calendar.style.transform = `scale(${scale})`;
        calendar.style.transformOrigin = "top center";
      });
    }

    roundTripBtn?.addEventListener("click", () => {
      tripType = "round";
      roundTripBtn.classList.add("active");
      oneWayBtn?.classList.remove("active");
      fp.set("mode", "range");
      fp.clear();
      localStorage.removeItem("departureDate");
      localStorage.removeItem("returnDate");
      updateSearchButton();
    });

    oneWayBtn?.addEventListener("click", () => {
      tripType = "one";
      oneWayBtn.classList.add("active");
      roundTripBtn?.classList.remove("active");
      fp.set("mode", "single");
      fp.clear();
      localStorage.removeItem("departureDate");
      localStorage.removeItem("returnDate");
      updateSearchButton();
    });

    searchFlightBtn?.addEventListener("click", searchFlightsForSelectedDate);

    function updateSearchButton() {
      const depart = localStorage.getItem("departureDate");
      const ret = localStorage.getItem("returnDate");

      if ((tripType === "one" && depart) || (tripType === "round" && depart && ret)) {
        searchFlightBtn.disabled = false;
        searchFlightBtn.classList.remove("disabled");
      } else {
        searchFlightBtn.disabled = true;
        searchFlightBtn.classList.add("disabled");
      }
    }

    updateSearchButton();
  }
});
