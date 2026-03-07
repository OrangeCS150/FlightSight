// Wait until the entire HTML document has loaded
// This ensures the page is ready before we add anything to it
document.addEventListener("DOMContentLoaded", () => {
  // "beforeend" means it adds the content just before </body>
  document.body.insertAdjacentHTML("beforeend", `
    
    <!-- AI Assistant Button (the ? button) -->
    <button id="ai-button" class="ai-button">?</button>

    <!-- Main AI Chat Box -->
    <div id="ai-box" class="ai-box hidden">

      <!-- Header section of the assistant -->
      <div class="ai-header">
        <span>Flight Sight Assistant</span>

        <!-- Close (X) button to hide the assistant -->
        <button id="ai-close" class="ai-close">✕</button>
      </div>

      <!-- Quick navigation buttons section -->
      <div class="ai-quick">

        <!-- Each button changes the browser's page using window.location.href -->
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

      <!-- Message display area -->
      <!-- This is where AI responses will appear -->
      <div class="ai-messages">

        <!-- Placeholder message shown before the user types anything -->
        <p class="ai-placeholder">
          Ask me about booking timing, baggage, layovers, seat classes, and delays!
        </p>
      </div>

      <!-- Input area where user types a question -->
      <div class="ai-input-row">

        <!-- Text box for user input -->
        <input 
          type="text" 
          id="ai-input" 
          placeholder="Type your question..." 
        />

        <!-- Send button to submit the question -->
        <button id="ai-send">Send</button>
      </div>
    </div>
  `);

});
