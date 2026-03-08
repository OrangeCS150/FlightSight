(function () {
    "use strict";
  
    function cleanText(el) {
      return (el?.textContent || "").replace(/\s+/g, " ").trim();
    }
  
    function parseFlightCard(card) {
      const airline = cleanText(card.querySelector(".airline-name"));
      const flightNumber =
        cleanText(card.querySelector(".flight-number")) ||
        cleanText(card.querySelector(".flight-top div > div:nth-child(2)"));
      const savedDate = cleanText(card.querySelector(".saved-date"));
  
      const routeCities = card.querySelectorAll(".route .city");
      const departCity = cleanText(routeCities[0]);
      const arriveCity = cleanText(routeCities[1]);
      const departTime =
        cleanText(card.querySelector(".route .depart-time")) ||
        cleanText(card.querySelectorAll(".route .time")[0]);
      const arriveTime =
        cleanText(card.querySelector(".route .arrive-time")) ||
        cleanText(card.querySelectorAll(".route .time")[1]);
  
      const duration = cleanText(card.querySelector(".route .duration"));
  
      const safety = cleanText(card.querySelector(".info-box.safety"))
        .replace(/^Safety Rating\s*/i, "")
        .trim();
      const environmental = cleanText(card.querySelector(".info-box.environmental"))
        .replace(/^Environmental\s*/i, "")
        .trim();
      const seat = cleanText(card.querySelector(".info-box.seat"))
        .replace(/^Seat Availability\s*/i, "")
        .trim();
  
      const priceText = cleanText(card.querySelector(".price"));
      const priceMatch = priceText.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
      const price = priceMatch ? `$${priceMatch[1]}` : priceText;
  
      return {
        id: card.dataset.flightId || `${airline}-${flightNumber}`.replace(/[^a-z0-9_-]+/gi, "_"),
        airline,
        flightNumber,
        savedDate,
        departCity,
        departTime,
        arriveCity,
        arriveTime,
        duration,
        safety,
        environmental,
        seat,
        price,
        _card: card,
      };
    }
  
    function collectFlights() {
      return Array.from(document.querySelectorAll(".flight-card")).map(parseFlightCard);
    }
  
    function optionLabel(f) {
      // ex: British Airways — Flight BA117 (JFK → LHR)
      const depCode = f.departCity.split("(")[1]?.replace(")", "") || f.departCity;
      const arrCode = f.arriveCity.split("(")[1]?.replace(")", "") || f.arriveCity;
      const route = f.departCity && f.arriveCity ? ` (${depCode} → ${arrCode})` : "";
      return `${f.airline} — ${f.flightNumber}${route}`;
    }
  
    function setSelectOptions(selectEl, flights, selectedId) {
      const current = selectedId || selectEl.value;
      selectEl.innerHTML = "";
  
      flights.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = optionLabel(f);
        selectEl.appendChild(opt);
      });
  
      if (current && flights.some((f) => f.id === current)) {
        selectEl.value = current;
      }
    }
  
    function renderRows(container, a, b) {
      const rows = [
        ["Price", a.price, b.price],
        ["Safety rating", a.safety, b.safety],
        ["Environmental", a.environmental, b.environmental],
        ["Duration", a.duration, b.duration],
        ["Seat availability", a.seat, b.seat],
        ["Departure", `${a.departCity} • ${a.departTime}`, `${b.departCity} • ${b.departTime}`],
        ["Arrival", `${a.arriveCity} • ${a.arriveTime}`, `${b.arriveCity} • ${b.arriveTime}`],
        ["Saved", a.savedDate, b.savedDate],
      ];
  
      container.innerHTML = "";
      rows.forEach(([metric, va, vb]) => {
        const row = document.createElement("div");
        row.className = "compare-row";
        row.setAttribute("role", "row");
  
        const c1 = document.createElement("div");
        c1.className = "compare-cell metric";
        c1.setAttribute("role", "cell");
        c1.textContent = metric;
  
        const c2 = document.createElement("div");
        c2.className = "compare-cell";
        c2.setAttribute("role", "cell");
        c2.textContent = va || "—";
  
        const c3 = document.createElement("div");
        c3.className = "compare-cell";
        c3.setAttribute("role", "cell");
        c3.textContent = vb || "—";
  
        row.appendChild(c1);
        row.appendChild(c2);
        row.appendChild(c3);
        container.appendChild(row);
      });
    }
  
    function setupCompare() {
      const selectA = document.getElementById("compareSelectA");
      const selectB = document.getElementById("compareSelectB");
      const compareBtn = document.getElementById("compareBtn");
      const message = document.getElementById("compareMessage");
      const results = document.getElementById("compareResults");
  
      if (!selectA || !selectB || !compareBtn || !message || !results) return;
  
      function refreshOptions() {
        const flights = collectFlights();
        setSelectOptions(selectA, flights, selectA.value);
        setSelectOptions(selectB, flights, selectB.value);
  
        // Default B to a different flight when possible
        if (flights.length >= 2 && selectA.value === selectB.value) {
          const alt = flights.find((f) => f.id !== selectA.value);
          if (alt) selectB.value = alt.id;
        }
  
        // If fewer than 2 flights, disable compare.
        const disabled = flights.length < 2;
        compareBtn.disabled = disabled;
        selectA.disabled = disabled;
        selectB.disabled = disabled;
  
        if (disabled) {
          results.hidden = true;
          message.textContent = "Save at least two flights to compare.";
        } else {
          message.textContent = "";
        }
  
        return flights;
      }
  
      function doCompare() {
        const flights = collectFlights();
        const a = flights.find((f) => f.id === selectA.value);
        const b = flights.find((f) => f.id === selectB.value);
  
        if (!a || !b) {
          results.hidden = true;
          message.textContent = "Please select two flights to compare.";
          return;
        }
        if (a.id === b.id) {
          results.hidden = true;
          message.textContent = "Please choose two different flights.";
          return;
        }
  
        message.textContent = "";
        results.hidden = false;
  
        document.getElementById("compareNameA").textContent = a.airline;
        document.getElementById("compareMetaA").textContent =
          `${a.flightNumber} • ${a.departCity} → ${a.arriveCity}`;
  
        document.getElementById("compareNameB").textContent = b.airline;
        document.getElementById("compareMetaB").textContent =
          `${b.flightNumber} • ${b.departCity} → ${b.arriveCity}`;
  
        renderRows(document.getElementById("compareRows"), a, b);
      }
  
      // Initial load
      refreshOptions();
  
      // Compare on click
      compareBtn.addEventListener("click", doCompare);
  
      // Keep options sane if user changes selections
      selectA.addEventListener("change", () => refreshOptions());
      selectB.addEventListener("change", () => refreshOptions());
  
      // Expose for delete handler / dynamic rendering
      window.__refreshCompareOptions = refreshOptions;
      window.__doCompare = doCompare;
    }
  
    function setupDeleteAndView() {
      // Delete flight card
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const card = btn.closest(".flight-card");
          if (!card) return;
  
          card.style.opacity = "0";
          setTimeout(() => {
            card.remove();
            if (typeof window.__refreshCompareOptions === "function") {
              window.__refreshCompareOptions();
            }
          }, 300);
        });
      });
  
      // View button action
      document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          alert("Opening flight details...");
        });
      });
    }
  
    document.addEventListener("DOMContentLoaded", () => {
      setupCompare();
      setupDeleteAndView();
    });
  })();