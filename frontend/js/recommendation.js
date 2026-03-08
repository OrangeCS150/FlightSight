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
