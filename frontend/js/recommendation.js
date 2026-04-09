<<<<<<< HEAD
(function () {
  "use strict";

  const PREF_KEY = "flightSight_recoPrefs_v1";

  function cleanText(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function parseNumberFromRating(text) {
    // handles "9.2/10" or "7.8/10"
    const m = String(text || "").match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }

  function parsePercent(text) {
    // handles "87% - High"
    const m = String(text || "").match(/(\d+)\s*%/);
    return m ? Number(m[1]) : null;
  }

  function parsePrice(text) {
    // handles "$450 per person"
    const m = String(text || "").match(/\$\s*(\d+(?:\.\d{1,2})?)/);
    return m ? Number(m[1]) : null;
  }

  function getFlights() {
    return Array.from(document.querySelectorAll(".flight-card")).map((card) => {
      const airline = cleanText(card.querySelector(".airline-name"));
      const flightNumber =
        cleanText(card.querySelector(".flight-number")) ||
        cleanText(card.querySelector(".flight-top div > div:nth-child(2)"));

      const cities = card.querySelectorAll(".route .city");
      const departCity = cleanText(cities[0]);
      const arriveCity = cleanText(cities[1]);

      const duration = cleanText(card.querySelector(".route .duration"));

      const safetyTxt = cleanText(card.querySelector(".info-box.safety")).replace(/^Safety Rating\s*/i, "");
      const envTxt = cleanText(card.querySelector(".info-box.environmental")).replace(/^Environmental\s*/i, "");
      const seatTxt = cleanText(card.querySelector(".info-box.seat")).replace(/^Seat Availability\s*/i, "");
      const priceTxt = cleanText(card.querySelector(".price"));

      const safety = parseNumberFromRating(safetyTxt);       // 0..10
      const env = parseNumberFromRating(envTxt);             // 0..10
      const seat = parsePercent(seatTxt);                    // 0..100
      const price = parsePrice(priceTxt);                    // dollars

      const id = (card.dataset.flightId || `${airline}-${flightNumber}`).replace(/[^a-z0-9_-]+/gi, "_");

      return { id, airline, flightNumber, departCity, arriveCity, duration, safety, env, seat, price, _card: card };
    });
  }

  function clamp01(x) {
    if (x == null || Number.isNaN(x)) return 0;
    return Math.max(0, Math.min(1, x));
  }

  function normalizePrice(price, minP, maxP) {
    // lower is better => map to 1..0
    if (price == null || minP == null || maxP == null || maxP === minP) return 0.5;
    return clamp01(1 - (price - minP) / (maxP - minP));
  }

  function normalize10(x) {
    if (x == null) return 0.5;
    return clamp01(x / 10);
  }

  function normalizeSeat(p) {
    if (p == null) return 0.5;
    return clamp01(p / 100);
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      const p = raw ? JSON.parse(raw) : null;
      if (!p) return null;
      return p;
    } catch {
      return null;
    }
  }

  function savePrefs(prefs) {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }

  function setSliderVal(id, val) {
    const el = document.getElementById(id);
    const label = document.getElementById(id + "Val");
    if (el) el.value = String(val);
    if (label) label.textContent = String(val);
  }

  function readWeights() {
    const wPrice = Number(document.getElementById("wPrice")?.value || 0);
    const wSafety = Number(document.getElementById("wSafety")?.value || 0);
    const wEnv = Number(document.getElementById("wEnv")?.value || 0);
    const wSeat = Number(document.getElementById("wSeat")?.value || 0);
    const notes = String(document.getElementById("recoNotes")?.value || "").trim();

    const sum = wPrice + wSafety + wEnv + wSeat || 1;

    return {
      wPrice: wPrice / sum,
      wSafety: wSafety / sum,
      wEnv: wEnv / sum,
      wSeat: wSeat / sum,
      notes,
    };
  }

  function scoreFlights(flights, weights) {
    const prices = flights.map((f) => f.price).filter((x) => typeof x === "number");
    const minP = prices.length ? Math.min(...prices) : null;
    const maxP = prices.length ? Math.max(...prices) : null;

    return flights.map((f) => {
      const nPrice = normalizePrice(f.price, minP, maxP);
      const nSafety = normalize10(f.safety);
      const nEnv = normalize10(f.env);
      const nSeat = normalizeSeat(f.seat);

      const score =
        weights.wPrice * nPrice +
        weights.wSafety * nSafety +
        weights.wEnv * nEnv +
        weights.wSeat * nSeat;

      const score100 = Math.round(score * 100);

      const reasons = [];
      reasons.push(`Price: ${f.price != null ? `$${f.price}` : "—"} (${Math.round(nPrice * 100)} / 100)`);
      reasons.push(`Safety: ${f.safety != null ? `${f.safety}/10` : "—"} (${Math.round(nSafety * 100)} / 100)`);
      reasons.push(`Environmental: ${f.env != null ? `${f.env}/10` : "—"} (${Math.round(nEnv * 100)} / 100)`);
      reasons.push(`Seats: ${f.seat != null ? `${f.seat}%` : "—"} (${Math.round(nSeat * 100)} / 100)`);

      return { ...f, score, score100, reasons };
    });
  }

  function renderRecommendations(items) {
    const grid = document.getElementById("recoGrid");
    const msg = document.getElementById("recoMessage");
    if (!grid || !msg) return;

    if (!items.length) {
      grid.innerHTML = "";
      msg.textContent = "Save flights to see recommendations.";
      return;
    }

    msg.textContent = `Top picks from your saved flights.`;

    grid.innerHTML = "";
    items.forEach((f) => {
      const card = document.createElement("div");
      card.className = "reco-item";

      const routeText =
        `${f.departCity || "—"} → ${f.arriveCity || "—"}`;

      card.innerHTML = `
        <div class="reco-top">
          <div>
            <div class="reco-airline">${f.airline || "Airline"}</div>
            <div class="reco-flight">${f.flightNumber || ""} • ${f.duration || ""}</div>
          </div>
          <div class="reco-score">${f.score100} / 100</div>
        </div>

        <div class="reco-route">
          ${routeText}<br/>
          <small>${f.price != null ? `$${f.price} per person` : "Price unavailable"}</small>
        </div>

        <div class="reco-reasons">
          <strong>Why this one:</strong><br/>
          • ${f.reasons[0]}<br/>
          • ${f.reasons[1]}<br/>
          • ${f.reasons[2]}<br/>
          • ${f.reasons[3]}
        </div>

        <div class="reco-actions">
          <button class="btn" type="button" data-scroll="${f.id}">View card</button>
        </div>
      `;

      card.querySelector('button[data-scroll]')?.addEventListener("click", () => {
        f._card?.scrollIntoView({ behavior: "smooth", block: "start" });
        f._card?.animate([{ transform: "scale(1)" }, { transform: "scale(1.01)" }, { transform: "scale(1)" }], {
          duration: 350
        });
      });

      grid.appendChild(card);
    });
  }

  function wireSliderLabel(id) {
    const input = document.getElementById(id);
    const label = document.getElementById(id + "Val");
    if (!input || !label) return;
    label.textContent = input.value;
    input.addEventListener("input", () => (label.textContent = input.value));
  }

  function refresh() {
    const flights = getFlights();
    const weights = readWeights();

    if (flights.length < 1) {
      renderRecommendations([]);
      return;
    }

    const scored = scoreFlights(flights, weights)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    renderRecommendations(scored);
  }

  function init() {
    wireSliderLabel("wPrice");
    wireSliderLabel("wSafety");
    wireSliderLabel("wEnv");
    wireSliderLabel("wSeat");

    const prefs = loadPrefs();
    if (prefs) {
      setSliderVal("wPrice", prefs.wPrice);
      setSliderVal("wSafety", prefs.wSafety);
      setSliderVal("wEnv", prefs.wEnv);
      setSliderVal("wSeat", prefs.wSeat);
      const notesEl = document.getElementById("recoNotes");
      if (notesEl) notesEl.value = prefs.notes || "";
    }

    document.getElementById("recoRefreshBtn")?.addEventListener("click", refresh);

    document.getElementById("recoSavePrefsBtn")?.addEventListener("click", () => {
      const p = {
        wPrice: Number(document.getElementById("wPrice")?.value || 0),
        wSafety: Number(document.getElementById("wSafety")?.value || 0),
        wEnv: Number(document.getElementById("wEnv")?.value || 0),
        wSeat: Number(document.getElementById("wSeat")?.value || 0),
        notes: String(document.getElementById("recoNotes")?.value || "").trim(),
      };
      savePrefs(p);
      document.getElementById("recoMessage").textContent = "Preferences saved.";
      refresh();
    });

    document.getElementById("recoClearPrefsBtn")?.addEventListener("click", () => {
      localStorage.removeItem(PREF_KEY);
      setSliderVal("wPrice", 5);
      setSliderVal("wSafety", 7);
      setSliderVal("wEnv", 4);
      setSliderVal("wSeat", 3);
      const notesEl = document.getElementById("recoNotes");
      if (notesEl) notesEl.value = "";
      document.getElementById("recoMessage").textContent = "Preferences reset.";
      refresh();
    });

    // If your delete button removes cards, refresh recos after deletes:
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".delete-btn");
      if (!btn) return;
      setTimeout(refresh, 350);
    });

    refresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
=======
// Recommendation System Module
const RecommendationModule = (() => {
  let currentAirlines = [];
  let panelInjected = false;

  const injectPanel = () => {
    if (panelInjected) return;

    fetch('../html/recommendationPanel.html')
      .then(response => response.text())
      .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        panelInjected = true;
        setupPanelEvents();
      })
      .catch(err => console.error('Failed to load recommendation panel:', err));
  };

  const setupPanelEvents = () => {
    const closeBtn = document.getElementById('recPanelClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeRecommendationPanel();
      });
    }
  };

  const openRecommendationPanel = () => {
    const panel = document.getElementById('recommendationPanel');
    if (panel) {
      panel.classList.add('open');
    }
  };

  const closeRecommendationPanel = () => {
    const panel = document.getElementById('recommendationPanel');
    if (panel) {
      panel.classList.remove('open');
    }
  };

  const fetchRecommendation = async (airlines) => {
    if (!airlines || airlines.length === 0) {
      alert('No airlines available for recommendation');
      return;
    }

    try {
      const payload = { airlines };
      console.log('[RECOMMENDATION] Request payload:', JSON.stringify(payload));

      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      console.log('[RECOMMENDATION] Raw response text:', rawText);
      console.log('[RECOMMENDATION] Response status:', response.status, response.ok);

      if (!response.ok) {
        let error;
        try {
          error = JSON.parse(rawText);
        } catch (e) {
          error = { error: rawText };
        }
        throw new Error(error.error || 'Recommendation request failed');
      }

      const data = JSON.parse(rawText);
      console.log('[RECOMMENDATION] Parsed response:', data);
      renderRecommendation(data);
      openRecommendationPanel();
    } catch (error) {
      console.error('[RECOMMENDATION] Error:', error);
      alert('Failed to get recommendation: ' + error.message);
    }
  };

  const renderRecommendation = (data) => {
    const { recommendedAirline, scoreBreakdown, rankedAirlines } = data;

    // Populate recommended airline
    document.getElementById('recAirlineName').textContent =
      recommendedAirline.airlineName || 'Unknown';
    document.getElementById('recAirlineScore').textContent =
      (rankedAirlines[0]?.totalScore || 0).toFixed(3);
    document.getElementById('recPrice').textContent =
      `$${recommendedAirline.price || '—'}`;
    document.getElementById('recSafety').textContent =
      `${recommendedAirline.safetyRating || '—'}%`;
    document.getElementById('recEmissions').textContent =
      `${recommendedAirline.emissionScore || '—'}`;
    document.getElementById('recDuration').textContent =
      `${recommendedAirline.duration || '—'} min`;
    document.getElementById('recStops').textContent =
      `${recommendedAirline.stops || '—'}`;
    document.getElementById('recSeats').textContent =
      `${recommendedAirline.seatAvailabilityPrediction || '—'}%`;

    // Populate breakdown table
    const tbody = document.getElementById('recBreakdownBody');
    tbody.innerHTML = '';

    Object.entries(scoreBreakdown).forEach(([feature, breakdown]) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${feature}</td>
        <td>${breakdown.normalizedScore.toFixed(3)}</td>
        <td>${breakdown.weight.toFixed(2)}</td>
        <td>${breakdown.contribution.toFixed(3)}</td>
      `;
      tbody.appendChild(row);
    });

    // Populate ranked list
    const rankedList = document.getElementById('recRankedList');
    rankedList.innerHTML = '';

    rankedAirlines.forEach((item, index) => {
      const rankNum = index + 1;
      const div = document.createElement('div');
      div.className = `rec-ranked-item rank-${rankNum}`;
      const rankClass = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : '🥉';
      div.innerHTML = `
        <span class="rec-ranked-name">${rankClass} ${item.airline.airlineName}</span>
        <span class="rec-ranked-score">${item.totalScore.toFixed(3)}</span>
      `;
      rankedList.appendChild(div);
    });
  };

  const setupGetRecommendationButton = () => {
    const recommendedCard = document.getElementById('recommendationCard');
    if (!recommendedCard) return;

    // Create button if not already present
    let btn = recommendedCard.querySelector('.rec-get-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'rec-button rec-get-btn';
      btn.textContent = 'Get Recommendation';
      recommendedCard.appendChild(btn);
    }

    btn.addEventListener('click', () => {
      const airlines = collectAirlines();
      fetchRecommendation(airlines);
    });
  };

  const collectAirlines = () => {
    // Parse airlines from the DOM if they exist
    // This is a sample implementation - adapt based on actual page structure
    const airlines = [];

    // Look for airline result cards/rows in the DOM
    // This depends on your actual HTML structure
    const airlineElements = document.querySelectorAll('[data-airline]');

    if (airlineElements.length > 0) {
      airlineElements.forEach(elem => {
        const airline = JSON.parse(elem.dataset.airline);
        airlines.push(airline);
      });
    } else {
      // Fallback: create sample airlines if none found
      airlines.push({
        airlineName: 'Delta Air Lines',
        price: 366,
        safetyRating: 79,
        emissionScore: 45,
        duration: 405,
        stops: 1,
        seatAvailabilityPrediction: 47,
        weatherScore: 85
      });
      airlines.push({
        airlineName: 'United Airlines',
        price: 350,
        safetyRating: 82,
        emissionScore: 50,
        duration: 390,
        stops: 0,
        seatAvailabilityPrediction: 60,
        weatherScore: 85
      });
      airlines.push({
        airlineName: 'American Airlines',
        price: 375,
        safetyRating: 76,
        emissionScore: 48,
        duration: 420,
        stops: 2,
        seatAvailabilityPrediction: 55,
        weatherScore: 80
      });
    }

    return airlines;
  };

  const initRecommendationUI = () => {
    // Inject panel HTML
    injectPanel();

    // Setup button after a short delay to ensure panel is loaded
    setTimeout(() => {
      setupGetRecommendationButton();
    }, 100);
  };

  const refreshRecommendation = (airlines) => {
    if (airlines && airlines.length > 0) {
      fetchRecommendation(airlines);
    }
  };

  // Public API
  return {
    initRecommendationUI,
    refreshRecommendation,
    openPanel: openRecommendationPanel,
    closePanel: closeRecommendationPanel
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    RecommendationModule.initRecommendationUI();
  });
} else {
  RecommendationModule.initRecommendationUI();
}
>>>>>>> main
