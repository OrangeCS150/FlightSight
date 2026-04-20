/**
 * Dataset Reader Module
 * Handles reading and importing flight data from CSV files
 * Uses existing parser patterns from the codebase
 */

const DatasetReader = (() => {
  /**
   * Parse CSV text into rows
   * @param {string} csvText - Raw CSV text
   * @returns {Array<string[]>} Array of row arrays
   */
  function parseCSVLines(csvText) {
    return csvText
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Handle quoted fields and comma separation
        const result = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });
  }

  /**
   * Load airports dataset from CSV
   * @returns {Promise<Array>} Array of airport objects
   */
  async function loadAirports() {
    try {
      const response = await fetch('/data/airports_list.csv');
      if (!response.ok) throw new Error('Failed to load airports');
      
      const csvText = await response.text();
      const rows = parseCSVLines(csvText);
      
      if (rows.length < 1) return [];
      
      const headers = rows[0];
      const airportIdx = headers.indexOf('airport');
      const nameIdx = headers.indexOf('airport_name');
      const cityIdx = headers.indexOf('city');
      
      return rows.slice(1).map(row => ({
        code: row[airportIdx]?.trim() || '',
        name: row[nameIdx]?.trim() || '',
        city: row[cityIdx]?.trim() || '',
        country: row.length > 4 ? row[4]?.trim() : ''
      })).filter(a => a.code);
    } catch (err) {
      console.error('Error loading airports:', err);
      return [];
    }
  }

  /**
   * Load airlines dataset from CSV
   * @returns {Promise<Array>} Array of airline objects
   */
  async function loadAirlines() {
    try {
      const response = await fetch('/data/airlines_list.csv');
      if (!response.ok) throw new Error('Failed to load airlines');
      
      const csvText = await response.text();
      const rows = parseCSVLines(csvText);
      
      if (rows.length < 1) return [];
      
      const headers = rows[0];
      const airlineIdx = headers.indexOf('airline');
      
      return rows.slice(1).map(row => ({
        name: row[airlineIdx]?.trim() || ''
      })).filter(a => a.name);
    } catch (err) {
      console.error('Error loading airlines:', err);
      return [];
    }
  }

  /**
   * Parse flight duration from various formats
   * @param {string|number} duration - Duration in seconds or "HhMm" format
   * @returns {number} Duration in minutes
   */
  function parseDuration(duration) {
    if (!duration) return 0;
    
    if (typeof duration === 'number') {
      return Math.round(duration / 60);
    }
    
    const str = String(duration);
    const hourMatch = str.match(/(\d+)h/);
    const minMatch = str.match(/(\d+)m/);
    
    let minutes = 0;
    if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) minutes += parseInt(minMatch[1]);
    
    return minutes || 0;
  }

  /**
   * Map flight data from various formats to standard flight object
   * @param {Object} data - Raw flight data
   * @returns {Object} Normalized flight object
   */
  function normalizeFlightData(data) {
    return {
      legId: data.legId || data.id || generateId(),
      origin: (data.startingAirport || data.origin || '').toUpperCase(),
      destination: (data.destinationAirport || data.destination || '').toUpperCase(),
      departureDate: data.flightDate || data.departureDate || new Date().toISOString().split('T')[0],
      airline: data.segmentsAirlineName ? data.segmentsAirlineName.split('||')[0].trim() : data.airline || 'Unknown',
      totalFare: parseFloat(data.totalFare || data.price || 0),
      travelDuration: formatDuration(parseDuration(data.travelDuration || data.duration)),
      flightTime: formatDuration(parseDuration(data.travelDuration || data.duration)),
      layoverTime: data.layoverTime || '0m',
      stops: parseInt(data.num_stops || data.stops || 0),
      seatAvailability: data.seatsRemaining || data.seatAvailability || 'Unknown',
      confidence: data.confidence || 'High',
      departureTime: data.segmentsDepartureTimeEpochSeconds ? new Date(parseInt(data.segmentsDepartureTimeEpochSeconds) * 1000).toISOString() : new Date().toISOString(),
      arrivalTime: data.segmentsArrivalTimeEpochSeconds ? new Date(parseInt(data.segmentsArrivalTimeEpochSeconds) * 1000).toISOString() : new Date().toISOString(),
      isPredicted: data.isPredicted || false
    };
  }

  /**
   * Format duration in minutes to readable string
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration (e.g., "5h 45m")
   */
  function formatDuration(minutes) {
    if (!minutes || minutes < 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Generate a simple unique ID
   * @returns {string} Unique ID
   */
  function generateId() {
    return 'flight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Load and normalize flight data from various sources
   * @param {string} source - Data source ('mock', 'csv', or URL)
   * @returns {Promise<Array>} Array of normalized flights
   */
  async function loadFlights(source = 'mock') {
    try {
      if (source === 'mock' || !source) {
        return getMockFlights();
      }
      
      const response = await fetch(source);
      if (!response.ok) throw new Error('Failed to load flight data');
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data.map(normalizeFlightData).filter(f => f.origin && f.destination);
      } else if (data.flights) {
        return data.flights.map(normalizeFlightData).filter(f => f.origin && f.destination);
      }
      
      return [];
    } catch (err) {
      console.error('Error loading flights:', err);
      return getMockFlights();
    }
  }

  /**
   * Get mock flight data (fallback)
   * @returns {Array} Mock flights
   */
  function getMockFlights() {
    return [
      {
        legId: 'mock_1',
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2024-12-01',
        airline: 'United Airlines',
        totalFare: 320,
        travelDuration: '5h 45m',
        flightTime: '5h 30m',
        layoverTime: '0m',
        stops: 0,
        seatAvailability: 'Available',
        confidence: 'High',
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 5.75 * 3600000).toISOString(),
        isPredicted: false
      }
    ];
  }

  /**
   * Validate flight data
   * @param {Object} flight - Flight object
   * @returns {boolean} Is valid
   */
  function validateFlight(flight) {
    const required = ['origin', 'destination', 'departureDate', 'airline', 'totalFare'];
    return required.every(key => flight[key] !== null && flight[key] !== undefined && flight[key] !== '');
  }

  // Public API
  return {
    loadAirports,
    loadAirlines,
    loadFlights,
    normalizeFlightData,
    validateFlight,
    parseDuration,
    formatDuration,
    parseCSVLines
  };
})();
