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

      const fare = flights.find((f) => typeof f.totalFare === "number")?.totalFare;
      if (typeof fare !== "number") {
        setBadgeCount(0);
        return;
      }

      const params = new URLSearchParams({ userEmail, currentFare: String(fare) });
      const evalResp = await fetch(`${API_BASE}/api/price-alerts/evaluate?${params.toString()}`);
      if (!evalResp.ok) {
        setBadgeCount(0);
        return;
      }

      const evalPayload = await evalResp.json();
      const alerts = Array.isArray(evalPayload?.alerts) ? evalPayload.alerts : [];
      const alertKeys = new Set(
        alerts.map((a) => `${a.origin || ""}|${a.destination || ""}|${a.departureDate || ""}|${a.airline || ""}`)
      );

      let count = 0;
      flights.forEach((f) => {
        const key = `${f.origin || ""}|${f.destination || ""}|${f.departureDate || ""}|${f.airline || ""}`;
        const matched = alertKeys.has(key);
        const triggered = matched && typeof f.totalFare === "number"
          ? alerts.some((a) =>
              `${a.origin || ""}|${a.destination || ""}|${a.departureDate || ""}|${a.airline || ""}` === key &&
              typeof a.threshold === "number" &&
              f.totalFare <= a.threshold
            )
          : false;
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
