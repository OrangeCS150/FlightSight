let map;
let heatmap;
let heatmapData = [];
let isHeatmapVisible = true;
const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;

window.gm_authFailure = function gmAuthFailure() {
  console.error('Google Maps authentication failed. Check API key validity, Maps JavaScript API enablement, billing, and HTTP referrer restrictions.');

  const mapElement = document.getElementById('map');
  if (mapElement) {
    mapElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:1rem;text-align:center;color:#b91c1c;font-weight:600;">Google Maps failed to authenticate. Check API key/billing/referrer restrictions in console.</div>';
  }
};

const SAMPLE_DEMAND_POINTS = [
  { airport: 'LAX', lat: 33.9416, lng: -118.4085, demandScore: 82 },
  { airport: 'JFK', lat: 40.6413, lng: -73.7781, demandScore: 95 },
  { airport: 'ORD', lat: 41.9742, lng: -87.9073, demandScore: 88 },
  { airport: 'ATL', lat: 33.6407, lng: -84.4277, demandScore: 100 },
  { airport: 'LHR', lat: 51.4700, lng: -0.4543, demandScore: 92 },
  { airport: 'CDG', lat: 49.0097, lng: 2.5479, demandScore: 85 },
  { airport: 'DXB', lat: 25.2532, lng: 55.3657, demandScore: 90 },
  { airport: 'NRT', lat: 35.7720, lng: 140.3929, demandScore: 78 },
  { airport: 'SFO', lat: 37.6213, lng: -122.3790, demandScore: 75 },
  { airport: 'DFW', lat: 32.8998, lng: -97.0403, demandScore: 80 },
  { airport: 'SYD', lat: -33.9399, lng: 151.1753, demandScore: 76 },
  { airport: 'SIN', lat: 1.3644, lng: 103.9915, demandScore: 89 }
];

function toHeatmapPoint(airport) {
  const lat = Number(airport?.lat ?? airport?.latitude);
  const lng = Number(airport?.lng ?? airport?.lon ?? airport?.longitude);
  const weight = Number(airport?.demandScore ?? airport?.weight ?? 1);

  const isValidCoordinate = Number.isFinite(lat)
    && Number.isFinite(lng)
    && Math.abs(lat) <= 90
    && Math.abs(lng) <= 180;

  if (!isValidCoordinate) {
    return null;
  }

  return {
    location: new google.maps.LatLng(lat, lng),
    weight: Math.max(1, weight)
  };
}

async function initDemandHeatMap() {
  if (window.location.protocol === 'file:') {
    console.error('Demand heatmap must be opened through a local server (http://localhost:3000), not file:// URLs.');
  }

  if (!window.google || !google.maps) {
    console.error('Google Maps JavaScript API failed to load. Check API key and restrictions.');
    return;
  }

  if (!google.maps.visualization || !google.maps.visualization.HeatmapLayer) {
    console.error('Google Maps visualization library is missing. Ensure libraries=visualization is in the script URL.');
    return;
  }

  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Map container with id="map" was not found.');
    return;
  }

  // Initialize map centered on the world
  map = new google.maps.Map(mapElement, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapTypeId: 'roadmap',
    styles: [
      {
        featureType: 'all',
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#c9e9f6' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }]
      }
    ]
  });

  // Fetch demand data from backend
  await loadDemandData();

  // Initialize heatmap layer and show by default
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapData,
    map,
    radius: 50,
    opacity: 0.7,
    gradient: [
      'rgba(0, 255, 255, 0)',
      'rgba(0, 255, 255, 1)',
      'rgba(0, 191, 255, 1)',
      'rgba(0, 127, 255, 1)',
      'rgba(0, 63, 255, 1)',
      'rgba(0, 0, 255, 1)',
      'rgba(0, 0, 223, 1)',
      'rgba(0, 0, 191, 1)',
      'rgba(0, 0, 159, 1)',
      'rgba(0, 0, 127, 1)',
      'rgba(63, 0, 91, 1)',
      'rgba(127, 0, 63, 1)',
      'rgba(191, 0, 31, 1)',
      'rgba(255, 0, 0, 1)'
    ]
  });

  // Setup toggle button
  setupToggleButton();
  setupMapControls();
}

async function loadDemandData() {
  let rawData = [];

  try {
    const response = await fetch('/api/demand-heatmap');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    rawData = await response.json();
    console.log(`Loaded ${rawData.length} airport demand records from backend`);
    
  } catch (error) {
    console.error('Error loading demand data:', error);
    console.warn('Falling back to built-in sample demand points.');
    rawData = SAMPLE_DEMAND_POINTS;
  }

  heatmapData = rawData
    .map(toHeatmapPoint)
    .filter(Boolean);

  if (!heatmapData.length) {
    console.error('No valid heatmap points were found in the data payload.');
    heatmapData = SAMPLE_DEMAND_POINTS
      .map(toHeatmapPoint)
      .filter(Boolean);
  }

  console.log(`Prepared ${heatmapData.length} valid heatmap points`);
}

function setupToggleButton() {
  const toggleBtn = document.getElementById('toggleHeatmap');
  if (!toggleBtn) {
    return;
  }

  toggleBtn.textContent = 'Hide Heatmap';
  toggleBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  
  toggleBtn.addEventListener('click', () => {
    isHeatmapVisible = !isHeatmapVisible;
    
    if (isHeatmapVisible) {
      heatmap.setMap(map);
      toggleBtn.textContent = 'Hide Heatmap';
      toggleBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    } else {
      heatmap.setMap(null);
      toggleBtn.textContent = 'Show Heatmap';
      toggleBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  });
}

function setupMapControls() {
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetMapBtn = document.getElementById('resetMapBtn');
  const zoomInfo = document.getElementById('zoomInfo');

  const updateZoomInfo = () => {
    if (!map || !zoomInfo) {
      return;
    }

    const currentZoom = map.getZoom() ?? DEFAULT_ZOOM;
    const zoomMultiplier = Math.pow(2, currentZoom - DEFAULT_ZOOM).toFixed(1);
    zoomInfo.textContent = `Zoom: ${zoomMultiplier}x • Drag to pan`;
  };

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const currentZoom = map.getZoom() ?? DEFAULT_ZOOM;
      map.setZoom(currentZoom + 1);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const currentZoom = map.getZoom() ?? DEFAULT_ZOOM;
      map.setZoom(currentZoom - 1);
    });
  }

  if (resetMapBtn) {
    resetMapBtn.addEventListener('click', () => {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    });
  }

  map.addListener('zoom_changed', updateZoomInfo);
  updateZoomInfo();
}

window.initDemandHeatMap = initDemandHeatMap;
