// Load environment variables from .env file (like DATABASE_URL)
require("dotenv").config();

// Import required packages
const express = require("express");        
const cors = require("cors");                 // Allows to talk to backend
const path = require("path");              
const { neon } = require("@neondatabase/serverless"); // Neon database connection
const bcrypt = require("bcryptjs");           // For hashing passwords for privacy

// Create Express app
const app = express();

// Connect to Neon database using DATABASE_URL from .env file 
const sql = neon(process.env.DATABASE_URL);
app.use(cors());

// Allow server to read JSON files for when frontend sends login email/password
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

// Default route. Sends login.html page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "html", "login.html"));
});


// Assistant returns simple flight-related answers
app.post("/api/assistant", (req, res) => {
  const msg = (req.body?.message || "").toLowerCase();

  // Default response if no keywords match
  let reply =
    "I can help with general flight questions (booking timing, baggage, layovers, seat classes, delays). Try asking one!";

  if (
    msg.includes("best time") ||
    msg.includes("when should i book") ||
    msg.includes("book flights") ||
    msg.includes("cheaper flights")
  ) {
    reply =
      "Domestic flights are often cheapest about 1–3 months in advance, and international flights about 2–6 months ahead. Flexibility helps reduce prices.";
  }

  // Check for baggage-related questions
  else if (msg.includes("baggage") || msg.includes("carry on") || msg.includes("checked")) {
    reply =
      "Most airlines allow one carry-on and one personal item. Checked baggage fees vary by airline and ticket type.";
  }

  // Check for layover/connection questions
  else if (msg.includes("layover") || msg.includes("connection")) {
    reply =
      "For domestic flights, allow 60–90 minutes between connections. For international trips, 2–3 hours is safer.";
  }

  // Check for delay/weather questions
  else if (msg.includes("delay") || msg.includes("weather")) {
    reply =
      "Weather delays happen due to storms, low visibility, or air traffic control restrictions. Early morning flights tend to have fewer delays.";
  }

  // Check for seat class questions
  else if (msg.includes("economy") || msg.includes("business") || msg.includes("first class")) {
    reply =
      "Economy is standard seating. Premium economy offers more comfort. Business class includes larger seats and better service.";
  }

  // Send response back to frontend as JSON
  res.json({ reply });
});

// sign ups
app.post("/auth/signup", async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  // make sure all fields are filled
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({
      error: "First name, last name, email, and password are required."
    });
  }

  try {
    // Check if email already exists in database
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email};
    `;

    // If user already exists, return error
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email is already registered." });
    }
    const passwordHash = await bcrypt.hash(password, 10);

    // append new user into database
    const inserted = await sql`
      INSERT INTO users (first_name, last_name, email, password_hash)
      VALUES (${first_name}, ${last_name}, ${email}, ${passwordHash})
      RETURNING id, first_name, last_name, email, created_at;
    `;

    res.status(201).json({
      message: "User created successfully.",
      user: inserted[0]
    });

  } catch (err) {
    // If something goes wrong, return 
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// login
app.post("/auth/login", async (req, res) => {

  // Get email and password 
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Look up user by email in database
    const rows = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${email};
    `;
    // If no user found, return error
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];
    // check the password
    const match = await bcrypt.compare(password, user.password_hash);

    // If passwords do not match
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3000;


//ZARYA'S FEATURES

//Emissions
app.get("/emissions", (req, res) => {
  res.json({ airline: "Delta", co2: 180 });
});

//Seat + Weather
app.get("/seatweather", (req, res) => {
  res.json({ seat_status: "Available", weather: "Clear" });
});

//Recommendation System (legacy endpoint)
app.get("/recommendation", (req, res) => {
  res.json({ best_airline: "United Airlines" });
});

//Recommendation System UC10 - POST endpoint for airline recommendation
app.post("/api/recommendation", (req, res) => {
  try {
    const { airlines } = req.body;

    // Validation
    if (!airlines || !Array.isArray(airlines) || airlines.length === 0) {
      return res.status(400).json({
        error: "Invalid request. Please provide an array of airlines with at least 1 airline."
      });
    }

    // Define feature metadata
    const features = {
      price: { betterAsLower: true, weight: 0.25 },
      safetyRating: { betterAsLower: false, weight: 0.20 },
      emissionScore: { betterAsLower: true, weight: 0.15 },
      duration: { betterAsLower: true, weight: 0.10 },
      stops: { betterAsLower: true, weight: 0.10 },
      seatAvailabilityPrediction: { betterAsLower: false, weight: 0.10 },
      weatherScore: { betterAsLower: false, weight: 0.10 }
    };

    // Normalize each feature using min-max normalization
    const normalized = airlines.map(airline => {
      const normalized_obj = { ...airline };

      Object.entries(features).forEach(([feature, meta]) => {
        if (!(feature in airline)) {
          normalized_obj[feature] = 0;
          return;
        }

        // Find min and max for this feature across all airlines
        const values = airlines
          .map(a => a[feature])
          .filter(v => typeof v === 'number' && !isNaN(v));

        if (values.length === 0) {
          normalized_obj[`${feature}_norm`] = 1;
          return;
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        let normalized_value;
        if (range === 0) {
          // All values are the same
          normalized_value = 1;
        } else if (meta.betterAsLower) {
          // For "lower is better": invert so higher normalized = better
          normalized_value = (max - airline[feature]) / range;
        } else {
          // For "higher is better"
          normalized_value = (airline[feature] - min) / range;
        }

        normalized_obj[`${feature}_norm`] = Math.max(0, Math.min(1, normalized_value));
      });

      return normalized_obj;
    });

    // Calculate weighted score for each airline
    const rankedAirlines = normalized.map(airline => {
      let totalScore = 0;
      const scoreBreakdown = {};

      Object.entries(features).forEach(([feature, meta]) => {
        const normalizedScore = airline[`${feature}_norm`] || 0;
        const weightedContribution = normalizedScore * meta.weight;
        totalScore += weightedContribution;

        scoreBreakdown[feature] = {
          normalizedScore: parseFloat(normalizedScore.toFixed(3)),
          weight: meta.weight,
          contribution: parseFloat(weightedContribution.toFixed(3))
        };
      });

      return {
        airline: {
          airlineName: airline.airlineName,
          price: airline.price,
          safetyRating: airline.safetyRating,
          emissionScore: airline.emissionScore,
          duration: airline.duration,
          stops: airline.stops,
          seatAvailabilityPrediction: airline.seatAvailabilityPrediction,
          weatherScore: airline.weatherScore
        },
        totalScore: parseFloat(totalScore.toFixed(3)),
        scoreBreakdown: scoreBreakdown
      };
    });

    // Sort by total score (descending)
    rankedAirlines.sort((a, b) => b.totalScore - a.totalScore);

    const recommendedAirline = rankedAirlines[0];

    res.json({
      recommendedAirline: recommendedAirline.airline,
      rankedAirlines: rankedAirlines,
      scoreBreakdown: recommendedAirline.scoreBreakdown
    });
  } catch (err) {
    console.error("POST /api/recommendation error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//Dataset Analysis
app.get("/analysis", (req, res) => {
  res.json({
    avg_price: 320,
    cheapest_city: "Dallas",
    busiest_month: "July"
  });
});

//Heatmap Data
app.get("/heatmap", (req, res) => {
  res.json([
    { city: "LA", demand: 90 },
    { city: "NYC", demand: 75 },
    { city: "Chicago", demand: 60 }
  ]);
// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Demand Heatmap - Airport Frequency Analysis
app.get("/api/demand-heatmap", (req, res) => {
  try {
    // Mock data for major airports with realistic demand scores
    const demandData = [
      { airport: "LAX", lat: 33.9416, lng: -118.4085, demandScore: 82 },
      { airport: "JFK", lat: 40.6413, lng: -73.7781, demandScore: 95 },
      { airport: "ORD", lat: 41.9742, lng: -87.9073, demandScore: 88 },
      { airport: "ATL", lat: 33.6407, lng: -84.4277, demandScore: 100 },
      { airport: "LHR", lat: 51.4700, lng: -0.4543, demandScore: 92 },
      { airport: "CDG", lat: 49.0097, lng: 2.5479, demandScore: 85 },
      { airport: "DXB", lat: 25.2532, lng: 55.3657, demandScore: 90 },
      { airport: "NRT", lat: 35.7720, lng: 140.3929, demandScore: 78 },
      { airport: "SFO", lat: 37.6213, lng: -122.3790, demandScore: 75 },
      { airport: "DFW", lat: 32.8998, lng: -97.0403, demandScore: 80 },
      { airport: "DEN", lat: 39.8561, lng: -104.6737, demandScore: 72 },
      { airport: "SEA", lat: 47.4502, lng: -122.3088, demandScore: 68 },
      { airport: "MIA", lat: 25.7959, lng: -80.2870, demandScore: 70 },
      { airport: "BOS", lat: 42.3656, lng: -71.0096, demandScore: 65 },
      { airport: "LAS", lat: 36.0840, lng: -115.1537, demandScore: 73 },
      { airport: "MCO", lat: 28.4312, lng: -81.3081, demandScore: 67 },
      { airport: "SYD", lat: -33.9399, lng: 151.1753, demandScore: 76 },
      { airport: "HKG", lat: 22.3080, lng: 113.9185, demandScore: 87 },
      { airport: "SIN", lat: 1.3644, lng: 103.9915, demandScore: 89 },
      { airport: "FRA", lat: 50.0379, lng: 8.5622, demandScore: 83 }
    ];
    
    res.json(demandData);
  } catch (err) {
    console.error("GET /api/demand-heatmap error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
