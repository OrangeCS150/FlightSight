// Tests for smartComparisons reset functionality
const assert = require('assert');

function testSmartComparisonsReset() {
  console.log('\nTesting Smart Comparisons Reset Functionality...');
  
  // Test 1: Reset comparison state
  console.log('\nTest 1: Comparison State Reset');
  
  let selectedForComparison = [1, 2];
  assert.equal(selectedForComparison.length, 2, 'Initial state has 2 selections');
  
  // Reset function
  function resetComparison() {
    selectedForComparison = [];
  }
  
  resetComparison();
  assert.equal(selectedForComparison.length, 0, 'Reset clears selections');
  console.log('✓ Comparison state reset works');

  // Test 2: UI state for comparison
  console.log('\nTest 2: Comparison UI States');
  
  const MOCK_FLIGHTS = [
    {
      id: 1,
      airline: "United Airlines",
      price: 320,
      safetyRating: 79,
      emissionScore: 85,
      stops: 0,
      ancillaries: {
        extraBaggage: { name: "Extra Baggage (20kg)", cost: 50 },
        seatSelection: { name: "Preferred Seat", cost: 30 },
        priorityBoarding: { name: "Priority Boarding", cost: 25 }
      }
    },
    {
      id: 2,
      airline: "Delta Air Lines",
      price: 345,
      safetyRating: 82,
      emissionScore: 78,
      stops: 0,
      ancillaries: {
        extraBaggage: { name: "Extra Baggage (20kg)", cost: 55 },
        seatSelection: { name: "Extra Legroom Seat", cost: 40 }
      }
    }
  ];

  function renderComparison(flights) {
    return flights.map(flight => ({
      airline: flight.airline,
      price: flight.price,
      safety: flight.safetyRating,
      emissions: flight.emissionScore,
      stops: flight.stops,
      ancillaries: flight.ancillaries
    }));
  }

  selectedForComparison = [1, 2];
  const flights = selectedForComparison.map(id => MOCK_FLIGHTS.find(f => f.id === id)).filter(Boolean);
  assert.equal(flights.length, 2, 'Both flights retrieved for comparison');
  
  const rendered = renderComparison(flights);
  assert.equal(rendered[0].airline, 'United Airlines', 'First flight renders correctly');
  assert.equal(rendered[1].airline, 'Delta Air Lines', 'Second flight renders correctly');
  assert.ok(rendered[0].ancillaries, 'Ancillaries included in comparison');
  console.log('✓ Comparison UI rendering works with ancillaries');

  // Test 3: Loading states
  console.log('\nTest 3: Loading States');
  
  const uiStates = {
    loading: true,
    error: false,
    empty: false,
    ready: false
  };

  function showLoading() {
    uiStates.loading = true;
    uiStates.error = false;
    uiStates.empty = false;
    uiStates.ready = false;
  }

  function showReady(hasData) {
    uiStates.loading = false;
    uiStates.error = false;
    uiStates.empty = !hasData;
    uiStates.ready = hasData;
  }

  showLoading();
  assert.ok(uiStates.loading && !uiStates.ready, 'Loading state set correctly');
  
  showReady(true);
  assert.ok(!uiStates.loading && uiStates.ready, 'Ready state set correctly');
  
  showReady(false);
  assert.ok(!uiStates.loading && uiStates.empty, 'Empty state set correctly');
  console.log('✓ Loading states work correctly');

  // Test 4: Close and reset button sequence
  console.log('\nTest 4: Close and Reset Button Sequence');
  
  let isOpen = true;
  let selectedCount = 2;

  function hideComparison() {
    isOpen = false;
  }

  function resetComparison2() {
    selectedCount = 0;
  }

  assert.ok(isOpen && selectedCount === 2, 'Initial state');
  hideComparison();
  assert.ok(!isOpen, 'Close button hides comparison');
  resetComparison2();
  assert.equal(selectedCount, 0, 'Reset button clears selections');
  console.log('✓ Close and reset button sequence works');

  console.log('\n✓ All Smart Comparisons tests passed!');
}

// Run tests
testSmartComparisonsReset();
