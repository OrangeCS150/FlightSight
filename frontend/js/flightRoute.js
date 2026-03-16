document.addEventListener("DOMContentLoaded", () => {
  /* ================= FLIGHT ROUTE PAGE LOGIC ================= */
  const continueBtn = document.querySelector(".continue-btn");
  const airportElements = document.querySelectorAll("#airportList li");
  const originInput = document.getElementById("origin");
  const destinationInput = document.getElementById("destination");

  if (airportElements.length) {
    let selectedOrigin = null;
    let selectedDestination = null;
    let selecting = "origin";

    airportElements.forEach((airportEl) => {
      airportEl.addEventListener("click", () => {
        const code = airportEl.dataset.code;
        if (!code) return;

        if (selecting === "origin") {
          selectedOrigin = code;
          selecting = "destination";
          if (originInput) originInput.value = code;
        } else {
          selectedDestination = code;
          selecting = "origin";
          if (destinationInput) destinationInput.value = code;
        }
      });
    });

    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        if (!selectedOrigin || !selectedDestination) {
          alert("Please select both origin and destination.");
          return;
        }

        console.log("Origin:", selectedOrigin);
        console.log("Destination:", selectedDestination);

        localStorage.setItem("origin", selectedOrigin);
        localStorage.setItem("destination", selectedDestination);

        window.location.href = "../html/booking.html";
      });
    }
  }
});