// ================= GOOGLE MAPS LOADER =================
function loadGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyCp_AMneKP1hVkXzMyMS2utb7AT-40LDlI&libraries=geometry";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const continueBtn = document.querySelector(".continue-btn");
  const airportList = document.getElementById("airportList");
  const originInput = document.getElementById("origin");
  const destinationInput = document.getElementById("destination");

  let airports = [];
  let selectedOrigin = null;
  let selectedDestination = null;
  let clickCount = 0;
  let markers = {};
  let map;
  let routeLine = null;

  const airportCoords = {
    LGA: { lat: 40.7769, lng: -73.874 },
    MIA: { lat: 25.7959, lng: -80.287 },
    ATL: { lat: 33.6407, lng: -84.4277 },
    CLT: { lat: 35.2144, lng: -80.9431 },
    IAD: { lat: 38.9531, lng: -77.4565 },
    DEN: { lat: 39.8561, lng: -104.6737 },
    PHL: { lat: 39.8729, lng: -75.2437 },
    SFO: { lat: 37.6213, lng: -122.379 },
    ORD: { lat: 41.9742, lng: -87.9073 },
    LAX: { lat: 33.9416, lng: -118.4085 },
    DTW: { lat: 42.2162, lng: -83.3554 },
    BOS: { lat: 42.3656, lng: -71.0096 },
    DFW: { lat: 32.8998, lng: -97.0403 },
    OAK: { lat: 37.7126, lng: -122.2197 },
    EWR: { lat: 40.6895, lng: -74.1745 },
    JFK: { lat: 40.6413, lng: -73.7781 },
  };

  function parseStoredAirport(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const airport = JSON.parse(raw);
      if (!airport?.code || !airport?.name) return null;
      return airport;
    } catch {
      return null;
    }
  }

  function storeRouteSelection() {
    if (!selectedOrigin || !selectedDestination) return;

    localStorage.setItem("origin", JSON.stringify(selectedOrigin));
    localStorage.setItem("destination", JSON.stringify(selectedDestination));
    localStorage.removeItem("selectedFlight");
  }

  async function loadCSV() {
    const response = await fetch("/data/airports_list.csv");
    const csvText = await response.text();

    const rows = csvText.split("\n").slice(1);
    rows.forEach((row) => {
      const cols = row.split(",");
      if (cols.length < 4) return;

      const airport = {
        code: cols[0].trim(),
        name: `${cols[0].trim()} - ${cols[2].trim()}`,
        city: cols[2].trim(),
      };

      airports.push(airport);
    });

    airports.sort((a, b) => a.city.localeCompare(b.city));

    airports.forEach((airport) => {
      const li = document.createElement("li");
      li.dataset.code = airport.code;
      li.textContent = `${airport.code} - ${airport.city}`;
      airportList.appendChild(li);
    });
  }

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

  function createCurvedPath(start, end, curvature = 0.3, points = 120) {
    const path = [];
    const latMid = (start.lat + end.lat) / 2;
    const lngMid = (start.lng + end.lng) / 2;
    const curveLat = latMid + (end.lng - start.lng) * curvature;
    const curveLng = lngMid - (end.lat - start.lat) * curvature;

    for (let i = 0; i <= points; i += 1) {
      const t = i / points;
      path.push({
        lat:
          (1 - t) * (1 - t) * start.lat +
          2 * (1 - t) * t * curveLat +
          t * t * end.lat,
        lng:
          (1 - t) * (1 - t) * start.lng +
          2 * (1 - t) * t * curveLng +
          t * t * end.lng,
      });
    }

    return path;
  }

  function drawRoute() {
    if (!selectedOrigin || !selectedDestination) return;

    const start = airportCoords[selectedOrigin.code];
    const end = airportCoords[selectedDestination.code];
    if (!start || !end) return;

    if (routeLine) routeLine.setMap(null);

    routeLine = new google.maps.Polyline({
      path: createCurvedPath(start, end),
      geodesic: true,
      strokeOpacity: 0,
      icons: [
        {
          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
          offset: "0",
          repeat: "12px",
        },
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
          },
          offset: "0%",
        },
      ],
      map,
    });
  }

  function updateMarkerColors() {
    Object.values(markers).forEach((marker) => {
      marker.setIcon("http://maps.google.com/mapfiles/ms/icons/red-dot.png");
    });

    if (selectedOrigin && markers[selectedOrigin.code]) {
      markers[selectedOrigin.code].setIcon(
        "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
      );
    }

    if (selectedDestination && markers[selectedDestination.code]) {
      markers[selectedDestination.code].setIcon(
        "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      );
    }
  }

  function setOrigin(airport) {
    selectedOrigin = airport;
    clickCount = 1;
    originInput.value = airport.name;
    originInput.classList.add("selected-departure");
    originInput.classList.remove("selected-destination");
    localStorage.setItem("origin", JSON.stringify(airport));
    updateMarkerColors();
    drawRoute();
  }

  function setDestination(airport) {
    selectedDestination = airport;
    clickCount = 0;
    destinationInput.value = airport.name;
    destinationInput.classList.add("selected-destination");
    destinationInput.classList.remove("selected-departure");
    localStorage.setItem("destination", JSON.stringify(airport));
    updateMarkerColors();
    drawRoute();
  }

  function hydrateSelectionFromStorage() {
    const storedOrigin = parseStoredAirport("origin");
    const storedDestination = parseStoredAirport("destination");

    if (storedOrigin && !selectedOrigin) {
      selectedOrigin = storedOrigin;
      originInput.value = storedOrigin.name;
      originInput.classList.add("selected-departure");
      originInput.classList.remove("selected-destination");
    }

    if (storedDestination && !selectedDestination) {
      selectedDestination = storedDestination;
      destinationInput.value = storedDestination.name;
      destinationInput.classList.add("selected-destination");
      destinationInput.classList.remove("selected-departure");
    }

    if (selectedOrigin && !selectedDestination) {
      clickCount = 1;
    } else if (!selectedOrigin && selectedDestination) {
      clickCount = 0;
    } else if (selectedOrigin && selectedDestination) {
      clickCount = 0;
      updateMarkerColors();
      drawRoute();
    }
  }

  function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 4,
      center: { lat: 39.8283, lng: -98.5795 },
    });

    Object.entries(airportCoords).forEach(([code, coords]) => {
      const marker = new google.maps.Marker({
        position: coords,
        map,
        title: code,
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });

      marker.addListener("click", () => {
        const airport = airports.find((a) => a.code === code);
        if (!airport) return;
        if (clickCount === 0) setOrigin(airport);
        else setDestination(airport);
      });

      markers[code] = marker;
    });
  }

  function updateClickCountFromInputs() {
    const originValue = originInput.value.trim();
    const destinationValue = destinationInput.value.trim();

    if (!originValue && !destinationValue) {
      selectedOrigin = null;
      selectedDestination = null;
      clickCount = 0;
    } else if (originValue && !destinationValue) {
      selectedDestination = null;
      clickCount = 1;
    } else if (!originValue && destinationValue) {
      selectedOrigin = null;
      clickCount = 0;
    } else {
      clickCount = 0;
    }

    updateMarkerColors();
  }

  originInput.addEventListener("input", () => {
    if (!originInput.value.trim()) {
      selectedOrigin = null;
      localStorage.removeItem("origin");
      originInput.classList.remove("selected-departure");
    }
    updateClickCountFromInputs();
  });

  destinationInput.addEventListener("input", () => {
    if (!destinationInput.value.trim()) {
      selectedDestination = null;
      localStorage.removeItem("destination");
      destinationInput.classList.remove("selected-destination");
    }
    updateClickCountFromInputs();
  });

  airportList.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;

    const airport = airports.find((a) => a.code === li.dataset.code);
    if (!airport) return;

    if (clickCount === 0) setOrigin(airport);
    else setDestination(airport);
  });

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      const finalOrigin = selectedOrigin || parseStoredAirport("origin");
      const finalDestination = selectedDestination || parseStoredAirport("destination");

      if (!finalOrigin || !finalDestination) {
        alert("Please select both origin and destination.");
        return;
      }

      selectedOrigin = finalOrigin;
      selectedDestination = finalDestination;

      storeRouteSelection();
      window.location.href = "calendar.html";
    });
  }

  setupAutocomplete("origin", "originSuggestions", setOrigin);
  setupAutocomplete("destination", "destinationSuggestions", setDestination);

  await Promise.all([loadGoogleMaps(), loadCSV()]);
  initMap();
  hydrateSelectionFromStorage();
});
