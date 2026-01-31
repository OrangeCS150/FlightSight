document.addEventListener("DOMContentLoaded", () => {  
  const roundTripBtn = document.getElementById("roundTrip");
  const oneWayBtn = document.getElementById("oneWay");
  const searchFlightBtn = document.getElementById("searchFlights");
  const routeDisplay = document.getElementById("selectedRoute");
  const calendarContainer = document.getElementById("calendarContainer");

  let tripType = "round";

  // NOTE: Your route storage keys must match what you set above.
  // You currently store "origin" and "destination" as JSON objects.
  const origin = localStorage.getItem("origin");
  const destination = localStorage.getItem("destination");

  if (origin && destination && routeDisplay) {
    try {
      const o = JSON.parse(origin);
      const d = JSON.parse(destination);
      routeDisplay.value = `${o.code} → ${d.code}`;
    } catch (e) {
      // fallback if it's not JSON
      routeDisplay.value = `${origin} → ${destination}`;
    }
  }

  if (calendarContainer && typeof flatpickr !== "undefined") {
    const fp = flatpickr(calendarContainer, {
      mode: tripType === "round" ? "range" : "single",
      minDate: "today",
      dateFormat: "M d, Y",
      inline: true,
      allowInput: false,
      showMonths: window.innerWidth < 768 ? 1 : 2,
      onReady: function(selectedDates, dateStr, instance) {
        // Initial scaling
        scaleFlatpickr(instance);

        // Re-scale on window resize
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

      // Wait until the browser has rendered the calendar
      requestAnimationFrame(() => {
        // Remove any existing scale
        calendar.style.transform = "";

        const containerWidth = rightSection.clientWidth - padding * 2;
        const calendarWidth = calendar.offsetWidth;

        // Compute scale factor (limit max to 1)
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

    searchFlightBtn?.addEventListener("click", () => {
      const depart = localStorage.getItem("departureDate");
      const ret = localStorage.getItem("returnDate");

      if (!depart) {
        alert("Please select a departure date.");
        return;
      }

      if (tripType === "round" && !ret) {
        alert("Please select a return date.");
        return;
      }

      // If you don’t have flights.html, change this to booking.html or wherever you go next
      window.location.href = "booking.html";
    });

    function updateSearchButton() {
      const depart = localStorage.getItem("departureDate");
      const ret = localStorage.getItem("returnDate");

      if (
        (tripType === "one" && depart) ||
        (tripType === "round" && depart && ret)
      ) {
        if (searchFlightBtn) {
          searchFlightBtn.disabled = false;
          searchFlightBtn.classList.remove("disabled");
        }
      } else {
        if (searchFlightBtn) {
          searchFlightBtn.disabled = true;
          searchFlightBtn.classList.add("disabled");
        }
      }
    }

    updateSearchButton();
  }
});