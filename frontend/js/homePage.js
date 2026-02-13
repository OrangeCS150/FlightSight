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

  document.getElementById("route-btn").addEventListener("click", function () {
    window.location.href = "route.html";
  });

  document.getElementById("demand-btn").addEventListener("click", function () {
    window.location.href = "demand.html";
  });

  document.getElementById("saved-btn").addEventListener("click", function () {
    window.location.href = "saved.html";
  });

});