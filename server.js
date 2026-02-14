require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");

const app = express();
const sql = neon(process.env.DATABASE_URL);

app.use(cors());
app.use(express.json());
app.use(express.static("frontend"));


// POST /auth/signup  -> create a new user
app.post("/auth/signup", async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res
      .status(400)
      .json({ error: "First name, last name, email, and password are required." });
  }

  try {
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email};
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await sql`
      INSERT INTO users (first_name, last_name, email, password_hash)
      VALUES (${first_name}, ${last_name}, ${email}, ${passwordHash})
      RETURNING id, first_name, last_name, email, created_at;
    `;

    const user = inserted[0];

    res.status(201).json({
      message: "User created successfully.",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("Signup error on server:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});


// POST /auth/login  -> verify email + password
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Find user by email
    const rows = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${email};
    `;

    if (rows.length === 0) {
      // Same message as wrong password so we don't leak which emails exist
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];

    // Compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Later you could add JWT/session here.
    res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error on server:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/* MEMBERS CRUD ROUTES */

app.get("/members", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM members ORDER BY id;`;
    res.json(rows);
  } catch (err) {
    console.error("GET /members error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/members", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }

  try {
    const inserted = await sql`
      INSERT INTO members (name)
      VALUES (${name})
      RETURNING *;
    `;
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("POST /members error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.put("/members/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }

  try {
    const updated = await sql`
      UPDATE members
      SET name = ${name}
      WHERE id = ${id}
      RETURNING *;
    `;

    if (updated.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json(updated[0]);
  } catch (err) {
    console.error("PUT /members/:id error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.delete("/members/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await sql`DELETE FROM members WHERE id = ${id};`;
    res.json({ message: "Member deleted" });
  } catch (err) {
    console.error("DELETE /members/:id error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

//ZARYA'S FEATURES

//Emissions
app.get("/emissions", (req, res) => {
  res.json({ airline: "Delta", co2: 180 });
});

//Seat + Weather
app.get("/seatweather", (req, res) => {
  res.json({ seat_status: "Available", weather: "Clear" });
});

//Recommendation System
app.get("/recommendation", (req, res) => {
  res.json({ best_airline: "United Airlines" });
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
});
