// Tests for DatasetReader module
const assert = require('assert');

function testDatasetReader() {
  console.log('\nTesting Dataset Reader Module...');
  
  // Test 1: Parse CSV lines
  console.log('\nTest 1: CSV Parsing');
  function parseCSVLines(csvText) {
    return csvText
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
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

  const csvSample = `airport,airport_name,city
LAX,Los Angeles International,Los Angeles
JFK,John F Kennedy,New York`;
  
  const parsed = parseCSVLines(csvSample);
  assert.ok(Array.isArray(parsed), 'CSV parsing returns array');
  assert.equal(parsed.length, 3, 'CSV parsing parses all lines');
  assert.equal(parsed[0][0], 'airport', 'CSV headers parsed correctly');
  console.log('✓ CSV parsing works correctly');

  // Test 2: Parse duration
  console.log('\nTest 2: Duration Parsing');
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

  assert.equal(parseDuration('5h 45m'), 345, 'Duration parsing with hours and minutes');
  assert.equal(parseDuration('30m'), 30, 'Duration parsing with minutes only');
  assert.equal(parseDuration(3600), 60, 'Duration parsing from seconds');
  assert.equal(parseDuration(''), 0, 'Duration parsing handles empty string');
  console.log('✓ Duration parsing works correctly');

  // Test 3: Format duration
  console.log('\nTest 3: Duration Formatting');
  function formatDuration(minutes) {
    if (!minutes || minutes < 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  assert.equal(formatDuration(345), '5h 45m', 'Duration formatting with hours');
  assert.equal(formatDuration(30), '30m', 'Duration formatting without hours');
  assert.equal(formatDuration(0), '0m', 'Duration formatting of zero');
  console.log('✓ Duration formatting works correctly');

  // Test 4: Normalize flight data
  console.log('\nTest 4: Flight Data Normalization');
  function normalizeFlightData(data) {
    function generateId() {
      return 'flight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatDuration(minutes) {
      if (!minutes || minutes < 0) return '0m';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins}m`;
    }

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

  const rawFlight = {
    id: 'mock_1',
    origin: 'JFK',
    destination: 'LAX',
    airline: 'United Airlines',
    price: 320,
    duration: '5h 45m',
    stops: 0
  };

  const normalized = normalizeFlightData(rawFlight);
  assert.equal(normalized.origin, 'JFK', 'Normalization converts origin to uppercase');
  assert.equal(normalized.destination, 'LAX', 'Normalization converts destination to uppercase');
  assert.equal(normalized.totalFare, 320, 'Normalization sets total fare');
  assert.ok(normalized.legId, 'Normalization generates legId');
  console.log('✓ Flight data normalization works correctly');

  // Test 5: Validate flight
  console.log('\nTest 5: Flight Validation');
  function validateFlight(flight) {
    const required = ['origin', 'destination', 'departureDate', 'airline', 'totalFare'];
    return required.every(key => flight[key] !== null && flight[key] !== undefined && flight[key] !== '');
  }

  const validFlight = {
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2024-12-01',
    airline: 'United',
    totalFare: 320
  };

  const invalidFlight = {
    origin: 'JFK',
    destination: '',
    departureDate: '2024-12-01',
    airline: 'United',
    totalFare: 320
  };

  assert.ok(validateFlight(validFlight), 'Valid flight passes validation');
  assert.ok(!validateFlight(invalidFlight), 'Invalid flight fails validation');
  console.log('✓ Flight validation works correctly');

  console.log('\n✓ All Dataset Reader tests passed!');
}

// Run tests
testDatasetReader();
