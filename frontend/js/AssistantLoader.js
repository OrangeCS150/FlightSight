document.addEventListener("DOMContentLoaded", () => {

  document.body.insertAdjacentHTML("beforeend", `
    <!-- AI Assistant Popup -->
    <button id="ai-button" class="ai-button">?</button>

    <div id="ai-box" class="ai-box hidden">
      <div class="ai-header">
        <span>Flight Sight Assistant</span>
        <button id="ai-close" class="ai-close">✕</button>
      </div>

      <div class="ai-quick">
        <button class="ai-quick-btn" onclick="window.location.href='./homePage.html'">Home</button>
        <button class="ai-quick-btn" onclick="window.location.href='./flightRoute.html'">Select Route</button>
        <button class="ai-quick-btn" onclick="window.location.href='./calendar.html'">Select Dates</button>
        <button class="ai-quick-btn" onclick="window.location.href='./booking.html'">My Trips / Booking</button>
        <button class="ai-quick-btn" onclick="window.location.href='./savedFlights.html'">Saved Flights</button>
        <button class="ai-quick-btn" onclick="window.location.href='./safety.html'">Safety Ratings</button>
        <button class="ai-quick-btn" onclick="window.location.href='./envImpact.html'">Environmental Impact</button>
        <button class="ai-quick-btn" onclick="window.location.href='./login.html'">Sign In</button>
        <button class="ai-quick-btn" onclick="window.location.href='./signup.html'">Create Account</button>
      </div>

      <div class="ai-messages">
        <p class="ai-placeholder">Ask me about booking timing, baggage, layovers, seat classes, and delays!</p>
      </div>

      <div class="ai-input-row">
        <input type="text" id="ai-input" placeholder="Type your question..." />
        <button id="ai-send">Send</button>
      </div>
    </div>
  `);

});
