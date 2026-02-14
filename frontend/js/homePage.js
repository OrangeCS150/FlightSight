document.addEventListener("DOMContentLoaded", () => {
  /* ================= GLOBAL NAVIGATION ================= */
  const searchBtn = document.querySelector(".search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      window.location.href = "flightRoute.html";
    });
  }

  document.getElementById("safety-btn").addEventListener("click", function () {
    window.location.href = "safety.html";
  });

  document.getElementById("impact-btn").addEventListener("click", function () {
    window.location.href = "envImpact.html";
  });

  document.getElementById("demand-btn").addEventListener("click", function () {
    window.location.href = "demand.html";
  });

  document.getElementById("saved-btn").addEventListener("click", function () {
    window.location.href = "savedFlights.html";
  });

});