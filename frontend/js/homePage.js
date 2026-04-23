document.addEventListener("DOMContentLoaded", async () => {
  /* ================= GLOBAL NAVIGATION ================= */
  const API_BASE = "http://localhost:3000";
  const userEmail = localStorage.getItem("userEmail") || "anonymous";

  function setBadgeCount(count) {
    const badge = document.getElementById("priceAlertBadgeHome");
    if (!badge) return;
    if (count > 0) {
      badge.style.display = "inline-flex";
      badge.textContent = String(count);
    } else {
      badge.style.display = "none";
      badge.textContent = "0";
    }
  }

  async function refreshPriceAlertBadge() {
    try {
      const savedResp = await fetch(`${API_BASE}/api/saved-flights`);
      if (!savedResp.ok) {
        setBadgeCount(0);
        return;
      }
      const savedPayload = await savedResp.json();
      const flights = Array.isArray(savedPayload?.flights) ? savedPayload.flights : [];
      if (!flights.length) {
        setBadgeCount(0);
        return;
      }

      const fares = [
        ...new Set(
          flights
            .map((f) => (typeof f.totalFare === "number" ? f.totalFare : null))
            .filter((v) => typeof v === "number")
        )
      ];

      if (!fares.length) {
        setBadgeCount(0);
        return;
      }

      const alertMap = new Map();
      for (const fare of fares) {
        const params = new URLSearchParams({ userEmail, currentFare: String(fare) });
        const evalResp = await fetch(`${API_BASE}/api/price-alerts/evaluate?${params.toString()}`);
        if (!evalResp.ok) continue;
        const evalPayload = await evalResp.json();
        const alerts = Array.isArray(evalPayload?.alerts) ? evalPayload.alerts : [];
        alerts.forEach((a) => {
          const key = `${a.origin || ""}|${a.destination || ""}|${a.departureDate || ""}|${a.airline || ""}`;
          if (!alertMap.has(key)) alertMap.set(key, a);
        });
      }

      let count = 0;
      flights.forEach((f) => {
        const key = `${f.origin || ""}|${f.destination || ""}|${f.departureDate || ""}|${f.airline || ""}`;
        const alert = alertMap.get(key);
        const triggered =
          !!alert &&
          typeof alert.threshold === "number" &&
          typeof f.totalFare === "number" &&
          f.totalFare <= alert.threshold;
        if (triggered) count += 1;
      });

      setBadgeCount(count);
    } catch {
      setBadgeCount(0);
    }
  }

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
    window.location.href = "demandHeatMap.html";
  });

  document.getElementById("saved-btn").addEventListener("click", function () {
    window.location.href = "savedFlights.html";
  });

  await refreshPriceAlertBadge();
});
