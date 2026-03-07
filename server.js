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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
