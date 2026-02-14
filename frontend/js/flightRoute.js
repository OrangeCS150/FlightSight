document.addEventListener("DOMContentLoaded", () => {
  /* ================= FLIGHT ROUTE PAGE LOGIC ================= */
  const continueBtn = document.querySelector(".continue-btn");
  const airportElements = document.querySelectorAll("#airportList li");

  if (airportElements.length) {
    const airports = Array.from(airportElements).map((li) => ({
      code: li.dataset.code,
      name: li.textContent,
    }));

    let selectedOrigin = null;
    let selectedDestination = null;

    function setupAutocomplete(inputId, suggestionId, onSelect) {
      const input = document.getElementById(inputId);
      const suggestions = document.getElementById(suggestionId);
      if (!input || !suggestions) return;

      input.addEventListener("input", () => {
        const value = input.value.toLowerCase();
        suggestions.innerHTML = "";

        if (!value) {
          suggestions.style.display = "none";
          return;
        }

        const matches = airports.filter(
          (a) =>
            a.name.toLowerCase().includes(value) ||
            a.code.toLowerCase().includes(value)
        );

        matches.forEach((airport) => {
          const li = document.createElement("li");
          li.textContent = airport.name;
          li.addEventListener("click", () => {
            input.value = airport.name;
            suggestions.style.display = "none";
            onSelect(airport);
          });
          suggestions.appendChild(li);
        });

        suggestions.style.display = matches.length ? "block" : "none";
      });

      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
          suggestions.style.display = "none";
        }
      });
    }

    setupAutocomplete("origin", "originSuggestions", (airport) => {
      selectedOrigin = airport;
    });

    setupAutocomplete("destination", "destinationSuggestions", (airport) => {
      selectedDestination = airport;
    });

    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        if (!selectedOrigin || !selectedDestination) {
          alert("Please select both origin and destination.");
          return;
        }

        // Store route (pick ONE naming scheme and keep it consistent everywhere)
        localStorage.setItem("origin", JSON.stringify(selectedOrigin));
        localStorage.setItem("destination", JSON.stringify(selectedDestination));

        window.location.href = "calendar.html";
      });
    }
  }
});