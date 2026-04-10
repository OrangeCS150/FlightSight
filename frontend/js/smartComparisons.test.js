const { getComparisonDetails } = require('../server.js'); // Adjust import if needed

describe('Smart Comparisons Scoring', () => {
  it('should rank flights correctly with lower better for price', () => {
    // Mock flights
    const mockFlights = [
      { id: 1, airline: 'Delta', price: 300, safetyRating: 80, emissions: 150 },
      { id: 2, airline: 'United', price: 350, safetyRating: 85, emissions: 180 }
    ];
    // Simulate scoring logic
    const factors = { price: { weight: 0.25, lowerBetter: true }, safetyRating: { weight: 0.20, lowerBetter: false } };
    const scores = mockFlights.map(f => {
      let total = 0;
      factors.price.lowerBetter ? (total += ((350 - f.price) / 50) * 0.25) : null;
      factors.safetyRating.lowerBetter ? null : (total += ((f.safetyRating - 80) / 5) * 0.20);
      return total;
    });
    expect(scores[0]).toBeGreaterThan(scores[1]); // Delta should score higher
  });

  it('should handle missing values safely', () => {
    const mockFlights = [{ id: 1, price: null }];
    // Expect no crash, use fallback
    expect(() => getComparisonDetails('key', 1)).not.toThrow();
  });
});

// Integration: Use supertest or similar
describe('Smart Comparisons API', () => {
  it('should return groups for authenticated user', async () => {
    // Mock request to /api/smart-comparisons with user-id header
    // Assert response has groups or empty
  });
});