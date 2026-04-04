document.addEventListener("DOMContentLoaded", async () => {

  const container = document.querySelector("main.container");

  // Clear static content
  container.innerHTML = "";

  try {
    // ================= FETCH BOOKINGS =================
    const res = await fetch("http://localhost:3000/bookings");
    const flights = await res.json();

    // ================= EMPTY STATE =================
    if (!flights || flights.length === 0) {
      container.innerHTML = "<p>No saved flights yet.</p>";
      return;
    }

    // ================= RENDER CARDS =================
    flights.forEach(flight => {

      const card = document.createElement("div");
      card.className = "flight-card";

      card.innerHTML = `
        <div class="flight-top">
          <div>
            <div class="airline-name">${flight.airline}</div>
            <div>${flight.departure_code} → ${flight.arrival_code}</div>
          </div>
          <div class="saved-date">
            Saved ${new Date(flight.created_at).toLocaleDateString()}
          </div>
        </div>

        <div class="route">
          <div>
            <div class="city">${flight.departure_code}</div>
            <div class="time">${flight.departure_time}</div>
          </div>

          <div class="duration">${flight.duration}</div>

          <div>
            <div class="city">${flight.arrival_code}</div>
            <div class="time">${flight.arrival_time}</div>
          </div>
        </div>

        <div class="info-grid">

          <div class="info-box safety">
            <strong>Safety Rating</strong><br />
            ${flight.safety}%
          </div>

          <div class="info-box environmental">
            <strong>CO₂</strong><br />
            ${flight.co2}
          </div>

          <div class="info-box weather">
            <strong>Weather</strong><br />
            D: ${flight.dep_condition}, ${flight.dep_temp}<br />
            A: ${flight.arr_condition}, ${flight.arr_temp}
          </div>

          <div class="info-box seat">
            <strong>Seat Availability</strong><br />
            ${flight.seat_fill}% - ${
              flight.seat_fill > 80 ? "High" :
              flight.seat_fill > 50 ? "Medium" : "Low"
            }
          </div>

        </div>

        <div class="actions">
          <div class="price">
            ${flight.total_price || "$---"}
            <span style="font-size: 12px; color: #6b7280">per person</span>
          </div>

          <button class="btn view-btn">View</button>
          <button class="btn delete delete-btn" data-id="${flight.id}">
            Delete
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    // ================= DELETE HANDLER =================
    document.querySelectorAll(".delete-btn").forEach(btn => {

      btn.addEventListener("click", async () => {

        const id = btn.dataset.id;

        const confirmDelete = confirm("Are you sure you want to delete this booking?");
        if (!confirmDelete) return;

        try {
          const res = await fetch(`http://localhost:3000/bookings/${id}`, {
            method: "DELETE"
          });

          const data = await res.json();

          if (data.success) {
            // Remove from UI
            btn.closest(".flight-card").remove();
          } else {
            alert("Failed to delete booking.");
          }

        } catch (err) {
          console.error(err);
          alert("Error deleting booking.");
        }

      });

    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading saved flights.</p>";
  }

});