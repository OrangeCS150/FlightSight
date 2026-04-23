document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "http://localhost:3000";
  const userEmail = localStorage.getItem("userEmail") || "anonymous";

  const alertsListEl = document.getElementById("alertsList");
  const statusEl = document.getElementById("alertsStatus");

  if (!alertsListEl || !statusEl) return;

  function setStatus(message, tone = "info") {
    statusEl.textContent = message;
    statusEl.classList.remove("status--info", "status--success", "status--warn");
    if (tone === "success") statusEl.classList.add("status--success");
    else if (tone === "warn") statusEl.classList.add("status--warn");
    else statusEl.classList.add("status--info");
  }

  function setBadgeCount(count) {
    const badge = document.getElementById("priceAlertBadgePage");
    if (!badge) return;
    if (count > 0) {
      badge.style.display = "inline-flex";
      badge.textContent = String(count);
    } else {
      badge.style.display = "none";
      badge.textContent = "0";
    }
  }

  function keyFromObj(obj) {
    return `${obj.origin || ""}|${obj.destination || ""}|${obj.departureDate || ""}|${obj.airline || ""}`;
  }

  async function loadSavedFlights() {
    const r = await fetch(`${API_BASE}/api/saved-flights`);
    if (!r.ok) throw new Error(`saved flights failed: ${r.status}`);
    const payload = await r.json();
    return Array.isArray(payload?.flights) ? payload.flights : [];
  }

  async function loadEvaluatedAlerts(currentFare) {
    const params = new URLSearchParams({
      userEmail,
      currentFare: String(currentFare ?? "")
    });
    const r = await fetch(`${API_BASE}/api/price-alerts/evaluate?${params.toString()}`);
    if (!r.ok) throw new Error(`evaluate failed: ${r.status}`);
    const payload = await r.json();
    return Array.isArray(payload?.alerts) ? payload.alerts : [];
  }

  async function updateAlert(alert, threshold) {
    const body = {
      userEmail,
      origin: alert.origin,
      destination: alert.destination,
      departureDate: alert.departureDate,
      airline: alert.airline,
      stops: alert.stops,
      currentFare: alert.currentFare,
      threshold
    };

    const resp = await fetch(`${API_BASE}/api/price-alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (resp.status === 409) {
      return { ok: true, duplicate: true };
    }

    if (!resp.ok) {
      let bodyText = "";
      try {
        bodyText = await resp.text();
      } catch {
        bodyText = "";
      }
      return { ok: false, message: bodyText || "Failed to update alert." };
    }

    return { ok: true, duplicate: false };
  }

  async function deleteAlert(alert) {
    const qs = new URLSearchParams({
      userEmail,
      origin: alert.origin || "",
      destination: alert.destination || "",
      departureDate: alert.departureDate || "",
      airline: alert.airline || ""
    });
    const resp = await fetch(`${API_BASE}/api/price-alerts?${qs.toString()}`, {
      method: "DELETE"
    });
    return resp.ok;
  }

  function renderEmpty() {
    alertsListEl.innerHTML = `
      <div class="alert-card">
        <div class="alert-route">No price alerts yet</div>
        <div class="alert-meta">Create a custom alert from Booking to start tracking fare drops.</div>
      </div>
    `;
    setBadgeCount(0);
  }

  async function render() {
    try {
      setStatus("Loading price alerts...", "info");
      const savedFlights = await loadSavedFlights();

      if (!savedFlights.length) {
        renderEmpty();
        setStatus("No saved flights found yet.", "info");
        return;
      }

      const firstFare = savedFlights.find((f) => typeof f.totalFare === "number")?.totalFare;
      const evalAlerts = await loadEvaluatedAlerts(firstFare);
      if (!evalAlerts.length) {
        renderEmpty();
        setStatus("No active price alerts yet.", "info");
        return;
      }

      const flightsByKey = new Map();
      savedFlights.forEach((f) => {
        flightsByKey.set(keyFromObj(f), f);
      });

      let triggeredCount = 0;
      alertsListEl.innerHTML = "";

      evalAlerts.forEach((alert) => {
        const key = keyFromObj(alert);
        const flight = flightsByKey.get(key);

        const currentFare =
          typeof flight?.totalFare === "number"
            ? flight.totalFare
            : typeof alert.currentFare === "number"
              ? alert.currentFare
              : null;

        const threshold =
          typeof alert.threshold === "number" ? alert.threshold : null;

        const triggered =
          typeof currentFare === "number" &&
          typeof threshold === "number" &&
          currentFare <= threshold;

        if (triggered) triggeredCount += 1;

        const card = document.createElement("article");
        card.className = "alert-card";

        card.innerHTML = `
          <div class="alert-top">
            <div>
              <div class="alert-route">${alert.origin || "?"} → ${alert.destination || "?"}</div>
              <div class="alert-meta">${alert.airline || "Unknown airline"} • ${alert.departureDate || "No date"}</div>
            </div>
            <div class="alert-chip ${triggered ? "alert-chip--hit" : "alert-chip--tracking"}">
              ${triggered ? "🔔 Triggered" : "🔔 Tracking"}
            </div>
          </div>

          <div class="alert-grid">
            <div class="info-box info-threshold">
              <strong>Threshold</strong>
              ${typeof threshold === "number" ? `$${threshold.toFixed(2)}` : "N/A"}
            </div>
            <div class="info-box info-current">
              <strong>Current Fare</strong>
              ${typeof currentFare === "number" ? `$${currentFare.toFixed(2)}` : "N/A"}
            </div>
            <div class="info-box info-baseline">
              <strong>Baseline</strong>
              ${typeof alert.baselineFare === "number" ? `$${alert.baselineFare.toFixed(2)}` : "N/A"}
            </div>
          </div>

          <div class="alert-actions">
            <input
              class="threshold-input"
              type="number"
              min="1"
              step="1"
              value="${typeof threshold === "number" ? threshold : ""}"
              placeholder="New threshold"
              aria-label="Update threshold for ${alert.origin || "origin"} to ${alert.destination || "destination"}"
            />
            <button class="btn btn-primary update-btn">Update</button>
            <button class="btn btn-danger delete-btn">Delete</button>
          </div>
        `;

        const input = card.querySelector(".threshold-input");
        const updateBtn = card.querySelector(".update-btn");
        const deleteBtn = card.querySelector(".delete-btn");

        updateBtn?.addEventListener("click", async () => {
          const next = Number(input?.value);
          if (!Number.isFinite(next) || next <= 0) {
            setStatus("Enter a valid threshold above $0.", "warn");
            return;
          }

          const result = await updateAlert(alert, next);
          if (!result.ok) {
            setStatus(result.message || "Failed to update alert.", "warn");
            return;
          }

          setStatus(result.duplicate ? "Alert already existed at this route. Threshold refreshed." : "Alert threshold updated.", "success");
          await render();
        });

        deleteBtn?.addEventListener("click", async () => {
          const ok = confirm("Delete this price alert?");
          if (!ok) return;

          const deleted = await deleteAlert(alert);
          if (!deleted) {
            setStatus("Failed to delete alert.", "warn");
            return;
          }

          setStatus("Price alert deleted.", "success");
          await render();
        });

        alertsListEl.appendChild(card);
      });

      setBadgeCount(triggeredCount);
      setStatus(triggeredCount > 0 ? `${triggeredCount} alert(s) triggered.` : "Alerts are active and tracking.", triggeredCount > 0 ? "success" : "info");
    } catch (err) {
      console.error("Price alerts load failed:", err);
      alertsListEl.innerHTML = "";
      setBadgeCount(0);
      setStatus("Could not load price alerts.", "warn");
    }
  }

  await render();
});
