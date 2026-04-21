// Load environment variables from .env file (like DATABASE_URL)
require("dotenv").config();

// Import required packages
const express = require("express");        
const cors = require("cors");                 // Allows to talk to backend
const path = require("path");              
const fsSync = require("fs");
const fs = require("fs/promises");
const readline = require("readline");
const { execFile } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");
// const { neon } = require("@neondatabase/serverless"); // Neon database connection
const bcrypt = require("bcryptjs");           // For hashing passwords for privacy

const execFileAsync = promisify(execFile);

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend/ so /html/calendar.html works
app.use(express.static(path.join(__dirname, "frontend")));
// Also serve frontend/html/ so /calendar.html works (no /html/ prefix needed)
app.use(express.static(path.join(__dirname, "frontend", "html")));
// Serve frontend/html/ at /html/ so /html/flightRoute.html and /html/smartComparisons.html work
app.use("/html", express.static(path.join(__dirname, "frontend", "html")));
// Expose backend data files at /data/ so frontend fetch("/data/...") works
app.use("/data", express.static(path.join(__dirname, "backend", "data")));

// Connect to Neon database using DATABASE_URL from .env file
// const sql = neon(process.env.DATABASE_URL);

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

function normalizeSavedFlight(input) {
  if (!input || typeof input !== "object") return null;

  const airline = String(input.airline || "").trim();
  const origin = String(input.origin || "").trim().toUpperCase();
  const destination = String(input.destination || "").trim().toUpperCase();
  const departureDate = String(input.departureDate || "").trim();

  if (!airline || !origin || !destination || !departureDate) {
    return null;
  }

  const totalFare = Number(input.totalFare);
  const stops = Number(input.stops);

  return {
    legId: input.legId || null,
    airline,
    origin,
    destination,
    departureDate,
    departureTime: input.departureTime || null,
    arrivalTime: input.arrivalTime || null,
    totalFare: Number.isFinite(totalFare) ? totalFare : null,
    travelDuration: input.travelDuration || null,
    flightTime: input.flightTime || null,
    layoverTime: input.layoverTime || null,
    stops: Number.isFinite(stops) ? stops : null,
    seatAvailability: input.seatAvailability || null,
    confidence: input.confidence || null,
    emissions: input.emissions || null,
    weather: input.weather || null,
    isPredicted: Boolean(input.isPredicted),
  };
}

function buildSavedFlightHash(flight) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        flight.legId,
        flight.airline,
        flight.origin,
        flight.destination,
        flight.departureDate,
        flight.departureTime,
        flight.arrivalTime,
        flight.totalFare,
        flight.travelDuration,
        flight.flightTime,
        flight.layoverTime,
        flight.stops,
        flight.seatAvailability,
        flight.confidence,
        flight.emissions,
        flight.weather,
        flight.isPredicted,
      ])
    )
    .digest("hex");
}

function mapSavedFlightRow(row) {
  return {
    id: Number(row.id),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    legId: row.leg_id,
    airline: row.airline,
    origin: row.origin,
    destination: row.destination,
    departureDate: String(row.departure_date).slice(0, 10),
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    totalFare: row.total_fare == null ? null : Number(row.total_fare),
    travelDuration: row.travel_duration,
    flightTime: row.flight_time,
    layoverTime: row.layover_time,
    stops: row.stops == null ? null : Number(row.stops),
    seatAvailability: row.seat_availability,
    confidence: row.confidence,
    emissions: row.emissions,
    weather: row.weather,
    isPredicted: Boolean(row.is_predicted),
  };
}

async function insertSavedFlight(flight) {
  const flightHash = buildSavedFlightHash(flight);
  const inserted = await sql`
    INSERT INTO saved_flights (
      flight_hash,
      leg_id,
      airline,
      origin,
      destination,
      departure_date,
      departure_time,
      arrival_time,
      total_fare,
      travel_duration,
      flight_time,
      layover_time,
      stops,
      seat_availability,
      confidence,
      emissions,
      weather,
      is_predicted
    )
    VALUES (
      ${flightHash},
      ${flight.legId},
      ${flight.airline},
      ${flight.origin},
      ${flight.destination},
      ${flight.departureDate},
      ${flight.departureTime},
      ${flight.arrivalTime},
      ${flight.totalFare},
      ${flight.travelDuration},
      ${flight.flightTime},
      ${flight.layoverTime},
      ${flight.stops},
      ${flight.seatAvailability},
      ${flight.confidence},
      ${flight.emissions},
      ${flight.weather},
      ${flight.isPredicted}
    )
    ON CONFLICT (flight_hash) DO NOTHING
    RETURNING
      id,
      created_at,
      leg_id,
      airline,
      origin,
      destination,
      departure_date,
      departure_time,
      arrival_time,
      total_fare,
      travel_duration,
      flight_time,
      layover_time,
      stops,
      seat_availability,
      confidence,
      emissions,
      weather,
      is_predicted;
  `;

  if (inserted.length > 0) {
    return { savedFlight: mapSavedFlightRow(inserted[0]), duplicate: false };
  }

  const existing = await sql`
    SELECT
      id,
      created_at,
      leg_id,
      airline,
      origin,
      destination,
      departure_date,
      departure_time,
      arrival_time,
      total_fare,
      travel_duration,
      flight_time,
      layover_time,
      stops,
      seat_availability,
      confidence,
      emissions,
      weather,
      is_predicted
    FROM saved_flights
    WHERE flight_hash = ${flightHash}
    LIMIT 1;
  `;

  return {
    savedFlight: existing.length > 0 ? mapSavedFlightRow(existing[0]) : null,
    duplicate: true,
  };
}

async function listSavedFlights() {
  const rows = await sql`
    SELECT
      id,
      created_at,
      leg_id,
      airline,
      origin,
      destination,
      departure_date,
      departure_time,
      arrival_time,
      total_fare,
      travel_duration,
      flight_time,
      layover_time,
      stops,
      seat_availability,
      confidence,
      emissions,
      weather,
      is_predicted
    FROM saved_flights
    ORDER BY created_at DESC, id DESC;
  `;

  return rows.map(mapSavedFlightRow);
}

async function getSavedFlightById(id) {
  const rows = await sql`
    SELECT
      id,
      created_at,
      leg_id,
      airline,
      origin,
      destination,
      departure_date,
      departure_time,
      arrival_time,
      total_fare,
      travel_duration,
      flight_time,
      layover_time,
      stops,
      seat_availability,
      confidence,
      emissions,
      weather,
      is_predicted
    FROM saved_flights
    WHERE id = ${id}
    LIMIT 1;
  `;

  return rows.length > 0 ? mapSavedFlightRow(rows[0]) : null;
}

async function deleteSavedFlightById(id) {
  const deleted = await sql`
    DELETE FROM saved_flights
    WHERE id = ${id}
    RETURNING id;
  `;

  return deleted.length > 0;
}


//ZARYA'S FEATURES

//Emissions
app.get("/emissions", async (req, res) => {
  const origin = (req.query.origin || "").toString().trim().toUpperCase();
  const destination = (req.query.destination || "").toString().trim().toUpperCase();
  const requestedAirline = (req.query.airline || "").toString().trim().toLowerCase();

  const fallbackCo2 = Math.floor(Math.random() * (320 - 180 + 1)) + 180;
  let co2 = fallbackCo2;
  let airline = "Unknown";

  try {
    const csvPath = path.join(__dirname, "backend", "data", "flights_sample.csv");
    const stream = fsSync.createReadStream(csvPath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headers = null;
    let originIdx = -1;
    let destinationIdx = -1;
    let airlineIdx = -1;
    let totalDistanceIdx = -1;
    let segmentDistanceIdx = -1;

    let firstRouteMatch = null;
    let preferredMatch = null;

    for await (const line of rl) {
      if (!line || !line.trim()) {
        continue;
      }

      if (!headers) {
        headers = splitCsvLine(line).map((header) => header.trim());
        originIdx = headers.indexOf("startingAirport");
        destinationIdx = headers.indexOf("destinationAirport");
        airlineIdx = headers.indexOf("segmentsAirlineName");
        totalDistanceIdx = headers.indexOf("totalTravelDistance");
        segmentDistanceIdx = headers.indexOf("segmentsDistance");
        continue;
      }

      if (!origin || !destination) {
        continue;
      }

      const columns = splitCsvLine(line);
      const rowOrigin = (columns[originIdx] || "").trim().toUpperCase();
      const rowDestination = (columns[destinationIdx] || "").trim().toUpperCase();

      if (rowOrigin !== origin || rowDestination !== destination) {
        continue;
      }

      if (!firstRouteMatch) {
        firstRouteMatch = columns;
      }

      const rowAirline = (columns[airlineIdx] || "").toString().trim().toLowerCase();
      if (requestedAirline && rowAirline && rowAirline.includes(requestedAirline)) {
        preferredMatch = columns;
        break;
      }
    }

    const selectedColumns = preferredMatch || firstRouteMatch;
    if (selectedColumns) {
      const totalDistance = Number(selectedColumns[totalDistanceIdx]);
      const segmentsDistanceRaw = (selectedColumns[segmentDistanceIdx] || "").toString();
      const segmentsDistance = segmentsDistanceRaw
        .split("||")
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .reduce((sum, value) => sum + value, 0);

      const distance = Number.isFinite(totalDistance) && totalDistance > 0
        ? totalDistance
        : segmentsDistance;

      // Convert miles to km before applying kg CO2 per km factor.
      const distanceKm = distance * 1.609;
      if (Number.isFinite(distanceKm) && distanceKm > 0) {
        co2 = Math.round(distanceKm * 0.09);
      }

      airline = (selectedColumns[airlineIdx] || "Unknown").trim() || "Unknown";
    }

    console.log("Emissions calculated for", origin || "N/A", "->", destination || "N/A", ":", co2, "kg");
    return res.json({ co2, airline });
  } catch (err) {
    console.error("GET /emissions error:", err);
    console.log("Emissions calculated for", origin || "N/A", "->", destination || "N/A", ":", co2, "kg");
    return res.json({ co2, airline });
  }
});

// Flight search from CSV for route/date selection
app.get("/api/flights/search", async (req, res) => {
  const origin = (req.query.origin || "").toString().trim().toUpperCase();
  const destination = (req.query.destination || "").toString().trim().toUpperCase();
  const departureDate = (req.query.departureDate || "").toString().trim();
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  if (!origin || !destination || !departureDate) {
    return res.status(400).json({
      error: "origin, destination, and departureDate are required (YYYY-MM-DD)."
    });
  }

  const csvPath = path.join(__dirname, "backend", "data", "flights_sample.csv");

  function firstSegment(value) {
    return String(value || "").split("||")[0].trim();
  }

  function lastSegment(value) {
    const segments = String(value || "")
      .split("||")
      .map((v) => v.trim())
      .filter(Boolean);
    return segments.length ? segments[segments.length - 1] : "";
  }

  try {
    const stream = fsSync.createReadStream(csvPath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headers = null;
    let startingAirportIdx = -1;
    let destinationAirportIdx = -1;
    let flightDateIdx = -1;
    let legIdIdx = -1;
    let airlineIdx = -1;
    let totalFareIdx = -1;
    let travelDurationIdx = -1;
    let isNonStopIdx = -1;
    let seatsRemainingIdx = -1;
    let departureRawIdx = -1;
    let arrivalRawIdx = -1;

    const matches = [];

    for await (const line of rl) {
      if (!line || !line.trim()) {
        continue;
      }

      if (!headers) {
        headers = splitCsvLine(line).map((h) => h.trim());
        startingAirportIdx = headers.indexOf("startingAirport");
        destinationAirportIdx = headers.indexOf("destinationAirport");
        flightDateIdx = headers.indexOf("flightDate");
        legIdIdx = headers.indexOf("legId");
        airlineIdx = headers.indexOf("segmentsAirlineName");
        totalFareIdx = headers.indexOf("totalFare");
        travelDurationIdx = headers.indexOf("travelDuration");
        isNonStopIdx = headers.indexOf("isNonStop");
        seatsRemainingIdx = headers.indexOf("seatsRemaining");
        departureRawIdx = headers.indexOf("segmentsDepartureTimeRaw");
        arrivalRawIdx = headers.indexOf("segmentsArrivalTimeRaw");
        continue;
      }

      const columns = splitCsvLine(line);

      const rowOrigin = (columns[startingAirportIdx] || "").trim().toUpperCase();
      const rowDestination = (columns[destinationAirportIdx] || "").trim().toUpperCase();
      const rowDate = (columns[flightDateIdx] || "").trim().slice(0, 10);

      if (rowOrigin !== origin || rowDestination !== destination || rowDate !== departureDate) {
        continue;
      }

      const totalFare = Number(columns[totalFareIdx]);
      const seatsRemaining = Number(columns[seatsRemainingIdx]);
      const isNonStopRaw = String(columns[isNonStopIdx] || "").trim().toLowerCase();

      matches.push({
        legId: (columns[legIdIdx] || "").trim() || `${rowOrigin}-${rowDestination}-${matches.length + 1}`,
        origin: rowOrigin,
        destination: rowDestination,
        departureDate: rowDate,
        airline: firstSegment(columns[airlineIdx]) || "Unknown",
        totalFare: Number.isFinite(totalFare) ? totalFare : null,
        travelDuration: (columns[travelDurationIdx] || "").trim() || null,
        isNonStop: isNonStopRaw === "true",
        seatsRemaining: Number.isFinite(seatsRemaining) ? seatsRemaining : null,
        departureTime: firstSegment(columns[departureRawIdx]) || null,
        arrivalTime: lastSegment(columns[arrivalRawIdx]) || null
      });

      if (matches.length >= limit) {
        break;
      }
    }

    res.json({
      origin,
      destination,
      departureDate,
      count: matches.length,
      flights: matches
    });
  } catch (err) {
    console.error("GET /api/flights/search error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// --- Lightweight in-repo fallback for /api/flights/predict ---
// Used ONLY when the ML pipeline (predict_flights_cli.py) errors due to
// missing local data files (e.g. route_airline_stats.csv). This path uses
// only files already present in the repo (backend/data/airlines_list.csv)
// plus the existing in-repo heuristic in backend/python/risk_score.py.
// No new datasets, no new files, no parallel route.

function _isMissingDataError(message) {
  if (!message) return false;
  const m = String(message);
  return (
    /No such file or directory/i.test(m) &&
    /(route_airline_stats\.csv|flights_sample\.csv|\.pkl|model)/i.test(m)
  ) || /missing.*(stats|model|csv)/i.test(m);
}

function _hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function _toIso(dateStr, hour, totalMin) {
  const base = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return { dep: null, arr: null };
  }
  const dep = new Date(base.getTime());
  dep.setHours(hour, 0, 0, 0);
  const arr = new Date(dep.getTime() + totalMin * 60 * 1000);
  return { dep: dep.toISOString(), arr: arr.toISOString() };
}

function _fmtDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

async function _readAirlinesList() {
  try {
    const csvPath = path.join(__dirname, "backend", "data", "airlines_list.csv");
    const text = await fs.readFile(csvPath, "utf-8");
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // skip header "airline"
    const out = lines.slice(1).filter((l) => l && l.toLowerCase() !== "airline");
    return out.length ? out : ["Delta", "United", "American Airlines", "JetBlue Airways"];
  } catch {
    return ["Delta", "United", "American Airlines", "JetBlue Airways"];
  }
}

async function buildLightweightPredictPayload(origin, destination, departureDate) {
  const airlines = await _readAirlinesList();
  const seedKey = `${origin}|${destination}|${departureDate}`;
  const seed = _hashStr(seedKey);

  // Deterministic small fan-out: 4 options, varied stops/hours/durations
  const picks = [];
  const pool = airlines.slice(0, Math.max(4, Math.min(airlines.length, 8)));
  for (let i = 0; i < 4; i++) {
    const airline = pool[(seed + i * 7) % pool.length];
    const stops = [0, 0, 1, 1][i];
    const hour = [7, 11, 15, 20][i];
    const flightMin = 180 + ((seed + i * 53) % 90); // 180..269
    const layoverMin = stops > 0 ? 45 + ((seed + i * 11) % 120) : 0;
    const totalMin = flightMin + layoverMin;
    const fareBase = 180 + ((seed + i * 37) % 220); // 180..399
    const fare = fareBase + (stops === 0 ? 40 : 0);
    const seats = 5 + ((seed + i * 17) % 50);
    const conf = stops === 0 ? "High" : "Low";

    picks.push({
      airline,
      stops,
      departure_hour: hour,
      flight_duration_min: flightMin,
      layover_duration_min: layoverMin,
      travel_duration_min: totalMin,
      flight_time: _fmtDuration(flightMin),
      layover_time: layoverMin > 0 ? _fmtDuration(layoverMin) : "0m",
      travel_time: _fmtDuration(totalMin),
      price: fare,
      seat_availability: `${seats} seats`,
      confidence: conf,
    });
  }

  // One-shot Python call into the existing in-repo risk_score.py.
  // No new files, no datasets — uses only backend/python/risk_score.py.
  const pythonCommand = process.env.PYTHON_BIN || "python";
  const inputJson = JSON.stringify({ departure_date: departureDate, options: picks });
  const inlineCode =
    "import sys,json,os\n" +
    "sys.path.insert(0, os.path.join(os.getcwd(), 'backend', 'python'))\n" +
    "from risk_score import compute_risk\n" +
    "data = json.loads(sys.stdin.read())\n" +
    "out = [compute_risk(o, data['departure_date']) for o in data['options']]\n" +
    "print(json.dumps(out))\n";

  let risks = [];
  try {
    const child = require("child_process").spawn(pythonCommand, ["-c", inlineCode], {
      cwd: __dirname,
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (c) => stdoutChunks.push(c));
    child.stderr.on("data", (c) => stderrChunks.push(c));
    child.stdin.write(inputJson);
    child.stdin.end();
    const code = await new Promise((resolve) => child.on("close", resolve));
    const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
    const stderr = Buffer.concat(stderrChunks).toString("utf-8");
    if (code === 0 && stdout.trim()) {
      risks = JSON.parse(stdout);
    } else if (stderr) {
      console.warn("/api/flights/predict lightweight risk_score stderr:", stderr.trim());
    }
  } catch (err) {
    console.warn("/api/flights/predict lightweight risk_score error:", err?.message || err);
  }

  const flights = picks.map((opt, idx) => {
    const { dep, arr } = _toIso(departureDate, opt.departure_hour, opt.travel_duration_min);
    const risk = risks[idx] || {
      delayCancellationRiskScore: 50,
      riskBand: "Moderate",
      riskExplanation: "Moderate risk (50/100). Lightweight fallback estimate.",
    };
    const legId = crypto
      .createHash("md5")
      .update(`${seedKey}|${opt.airline}|${opt.stops}|${idx}`)
      .digest("hex")
      .slice(0, 16);
    return {
      legId,
      origin,
      destination,
      departureDate,
      airline: opt.airline,
      totalFare: opt.price,
      travelDuration: opt.travel_time,
      flightTime: opt.flight_time,
      layoverTime: opt.layover_time,
      stops: opt.stops,
      seatAvailability: opt.seat_availability,
      confidence: opt.confidence,
      departureTime: dep,
      arrivalTime: arr,
      isPredicted: true,
      delayCancellationRiskScore: risk.delayCancellationRiskScore,
      riskBand: risk.riskBand,
      riskExplanation: risk.riskExplanation,
      source: "lightweight",
    };
  });

  flights.sort((a, b) => (a.totalFare - b.totalFare) || (a.stops - b.stops));

  return {
    origin,
    destination,
    departureDate,
    count: flights.length,
    flights,
    source: "lightweight",
  };
}

// Flight search using Python prediction pipeline for current/future dates
app.get("/api/flights/predict", async (req, res) => {
  const origin = (req.query.origin || "").toString().trim().toUpperCase();
  const destination = (req.query.destination || "").toString().trim().toUpperCase();
  const departureDate = (req.query.departureDate || "").toString().trim();

  if (!origin || !destination || !departureDate) {
    return res.status(400).json({
      error: "origin, destination, and departureDate are required (YYYY-MM-DD)."
    });
  }

  const pythonScript = path.join(__dirname, "backend", "python", "predict_flights_cli.py");
  const pythonCommand = process.env.PYTHON_BIN || "python";

  try {
    const { stdout, stderr } = await execFileAsync(
      pythonCommand,
      [
        pythonScript,
        "--origin",
        origin,
        "--destination",
        destination,
        "--departureDate",
        departureDate
      ],
      {
        cwd: __dirname,
        maxBuffer: 1024 * 1024 * 10
      }
    );

    if (stderr && stderr.trim()) {
      console.warn("/api/flights/predict python stderr:", stderr.trim());
    }

    const payload = JSON.parse(stdout || "{}");

    if (payload.error) {
      if (_isMissingDataError(payload.error)) {
        console.warn("/api/flights/predict falling back to lightweight (missing data):", payload.error);
        try {
          const fallback = await buildLightweightPredictPayload(origin, destination, departureDate);
          return res.json(fallback);
        } catch (fallbackErr) {
          console.error("/api/flights/predict lightweight fallback failed:", fallbackErr);
          return res.status(500).json({ error: payload.error });
        }
      }
      return res.status(500).json({ error: payload.error });
    }

    res.json(payload);
  } catch (err) {
    console.error("GET /api/flights/predict error:", err);

    const stderr = err?.stderr ? String(err.stderr) : "";
    let parsedErrMsg = null;
    if (stderr) {
      try {
        const parsed = JSON.parse(stderr);
        if (parsed?.error) parsedErrMsg = parsed.error;
      } catch {
        // fall through
      }
    }

    const candidate = parsedErrMsg || err?.message || "";
    if (_isMissingDataError(candidate)) {
      console.warn("/api/flights/predict falling back to lightweight (missing data):", candidate);
      try {
        const fallback = await buildLightweightPredictPayload(origin, destination, departureDate);
        return res.json(fallback);
      } catch (fallbackErr) {
        console.error("/api/flights/predict lightweight fallback failed:", fallbackErr);
      }
    }

    if (parsedErrMsg) {
      return res.status(500).json({ error: parsedErrMsg });
    }

    res.status(500).json({
      error: "Prediction pipeline failed. Ensure model/stats files exist and Python dependencies are installed."
    });
  }
});

// Saved Flights API
app.post("/api/saved-flights", async (req, res) => {
  try {
    const payload = req.body?.selectedFlight || req.body;
    const normalized = normalizeSavedFlight(payload);

    if (!normalized) {
      return res.status(400).json({
        error: "Invalid saved flight payload. Required fields: airline, origin, destination, departureDate."
      });
    }

    const { savedFlight, duplicate } = await insertSavedFlight(normalized);

    if (!savedFlight) {
      return res.status(500).json({ error: "Failed to save flight." });
    }

    res.status(duplicate ? 200 : 201).json({ success: true, savedFlight });
  } catch (err) {
    console.error("POST /api/saved-flights error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/saved-flights", async (req, res) => {
  try {
    const flights = await listSavedFlights();
    res.json({ flights });
  } catch (err) {
    console.error("GET /api/saved-flights error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/saved-flights/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid saved flight id." });
  }

  try {
    const savedFlight = await getSavedFlightById(id);
    if (!savedFlight) {
      return res.status(404).json({ error: "Saved flight not found." });
    }

    res.json({ savedFlight });
  } catch (err) {
    console.error("GET /api/saved-flights/:id error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.delete("/api/saved-flights/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid saved flight id." });
  }

  try {
    const deleted = await deleteSavedFlightById(id);
    if (!deleted) {
      return res.status(404).json({ error: "Saved flight not found." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/saved-flights/:id error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
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
});

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function getRandomDemandScore() {
  return Math.floor(Math.random() * 41) + 60;
}

// Demand Heatmap - Airport Frequency Analysis
app.get("/api/demand-heatmap", async (req, res) => {
  try {
    const airportsCsvPath = path.join(__dirname, "backend", "data", "airports_list.csv");
    const csvText = await fs.readFile(airportsCsvPath, "utf-8");
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return res.json([]);
    }

    const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
    const airportIdx = headers.findIndex((header) => ["airport", "iata", "airport_code", "code"].includes(header));
    const latIdx = headers.findIndex((header) => ["lat", "latitude", "airport_lat"].includes(header));
    const lngIdx = headers.findIndex((header) => ["lng", "lon", "longitude", "airport_lng"].includes(header));

    const fallbackCoordinatesByCode = {
      LGA: { lat: 40.7769, lng: -73.8740 },
      MIA: { lat: 25.7959, lng: -80.2870 },
      ATL: { lat: 33.6407, lng: -84.4277 },
      CLT: { lat: 35.2140, lng: -80.9431 },
      IAD: { lat: 38.9531, lng: -77.4565 },
      DEN: { lat: 39.8561, lng: -104.6737 },
      PHL: { lat: 39.8744, lng: -75.2424 },
      SFO: { lat: 37.6213, lng: -122.3790 },
      SEA: { lat: 47.4502, lng: -122.3088 },
      ORD: { lat: 41.9742, lng: -87.9073 },
      LAX: { lat: 33.9416, lng: -118.4085 },
      DTW: { lat: 42.2162, lng: -83.3554 },
      BOS: { lat: 42.3656, lng: -71.0096 },
      DFW: { lat: 32.8998, lng: -97.0403 },
      OAK: { lat: 37.7126, lng: -122.2197 },
      EWR: { lat: 40.6895, lng: -74.1745 },
      JFK: { lat: 40.6413, lng: -73.7781 }
    };

    const heatmapData = lines
      .slice(1)
      .map((line) => splitCsvLine(line))
      .map((columns) => {
        const airportCode = (airportIdx >= 0 ? columns[airportIdx] : "").toUpperCase();

        let lat = Number(latIdx >= 0 ? columns[latIdx] : NaN);
        let lng = Number(lngIdx >= 0 ? columns[lngIdx] : NaN);

        if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && fallbackCoordinatesByCode[airportCode]) {
          lat = fallbackCoordinatesByCode[airportCode].lat;
          lng = fallbackCoordinatesByCode[airportCode].lng;
        }

        if (!airportCode || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        return {
          airport: airportCode,
          lat,
          lng,
          demandScore: getRandomDemandScore()
        };
      })
      .filter(Boolean);

    console.log(`Loaded ${heatmapData.length} airports from airports_list.csv`);

    res.json(heatmapData);
  } catch (err) {
    console.error("GET /api/demand-heatmap error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/* =========================
   Price Alerts (additive)
   Threshold: 100
   ========================= */
const PRICE_ALERT_DEFAULT_THRESHOLD = 100;
const priceAlertsStore = new Map();

function normalizePriceAlert(input = {}) {
  const origin = String(input.origin || "").trim().toUpperCase();
  const destination = String(input.destination || "").trim().toUpperCase();
  const departureDate = String(input.departureDate || "").trim();
  const airline = String(input.airline || "").trim();
  const userEmail = String(input.userEmail || "anonymous").trim().toLowerCase();
  const thresholdRaw = input.threshold;
  const threshold =
    thresholdRaw === undefined || thresholdRaw === null || thresholdRaw === ""
      ? PRICE_ALERT_DEFAULT_THRESHOLD
      : Number(thresholdRaw);

  const currentFareRaw = input.currentFare ?? input.totalFare;
  const currentFare =
    currentFareRaw === undefined || currentFareRaw === null || currentFareRaw === ""
      ? null
      : Number(currentFareRaw);

  const stopsRaw = input.stops;
  const stops =
    stopsRaw === undefined || stopsRaw === null || stopsRaw === ""
      ? null
      : Number(stopsRaw);

  if (!origin || !destination || !departureDate || !airline) {
    return { error: "origin, destination, departureDate, and airline are required." };
  }
  if (!Number.isFinite(threshold) || threshold < 0) {
    return { error: "threshold must be a non-negative number." };
  }
  if (currentFare !== null && (!Number.isFinite(currentFare) || currentFare < 0)) {
    return { error: "currentFare must be a non-negative number when provided." };
  }
  if (stops !== null && !Number.isFinite(stops)) {
    return { error: "stops must be numeric when provided." };
  }

  return {
    userEmail,
    origin,
    destination,
    departureDate,
    airline,
    stops: stops === null ? null : Math.max(0, Math.trunc(stops)),
    threshold: Math.trunc(threshold),
    currentFare,
  };
}

function buildPriceAlertKey(alert) {
  return [
    alert.userEmail,
    alert.origin,
    alert.destination,
    alert.departureDate,
    alert.airline.toLowerCase(),
  ].join("|");
}

function parseMaybeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function baselineCandidates(alert, row) {
  const route = `${alert.origin}_${alert.destination}`;
  const rowStops = parseMaybeNumber(row.num_stops);
  const sameStops = alert.stops === null || rowStops === alert.stops;
  return {
    level1:
      row.route === route &&
      row.startingAirport === alert.origin &&
      row.destinationAirport === alert.destination &&
      String(row.main_airline || "").toLowerCase() === alert.airline.toLowerCase() &&
      sameStops,
    level2:
      row.route === route &&
      row.startingAirport === alert.origin &&
      row.destinationAirport === alert.destination &&
      sameStops,
    level3:
      String(row.main_airline || "").toLowerCase() === alert.airline.toLowerCase() &&
      sameStops,
    level4: sameStops,
  };
}

async function lookupBaselineFare(alert) {
  const statsPath = path.join(__dirname, "backend", "data", "route_airline_stats.csv");
  let csvText = "";
  try {
    csvText = await fs.readFile(statsPath, "utf8");
  } catch {
    return { baselineFare: null, source: "missing_stats_csv", count: 0 };
  }

  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return { baselineFare: null, source: "empty_stats_csv", count: 0 };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] ?? "").trim();
    });
    return obj;
  });

  const tiers = { level1: [], level2: [], level3: [], level4: [] };
  for (const row of rows) {
    const flags = baselineCandidates(alert, row);
    if (flags.level1) tiers.level1.push(row);
    else if (flags.level2) tiers.level2.push(row);
    else if (flags.level3) tiers.level3.push(row);
    else if (flags.level4) tiers.level4.push(row);
  }

  const pickTier =
    tiers.level1.length ? ["level1", tiers.level1] :
    tiers.level2.length ? ["level2", tiers.level2] :
    tiers.level3.length ? ["level3", tiers.level3] :
    tiers.level4.length ? ["level4", tiers.level4] :
    null;

  if (!pickTier) {
    return { baselineFare: null, source: "no_match", count: 0 };
  }

  const [source, bucket] = pickTier;
  const fares = bucket
    .map((r) => parseMaybeNumber(r.avg_price))
    .filter((n) => Number.isFinite(n));

  if (!fares.length) {
    return { baselineFare: null, source: `${source}_no_avg_price`, count: bucket.length };
  }

  const baselineFare = Number((fares.reduce((a, b) => a + b, 0) / fares.length).toFixed(2));
  return { baselineFare, source, count: bucket.length };
}

async function evaluatePriceAlert(alert, overrideCurrentFare = null) {
  const currentFare =
    overrideCurrentFare !== null && overrideCurrentFare !== undefined
      ? Number(overrideCurrentFare)
      : alert.currentFare;

  const baseline = await lookupBaselineFare(alert);
  if (!Number.isFinite(currentFare) || currentFare < 0) {
    return {
      ...alert,
      currentFare: currentFare ?? null,
      baselineFare: baseline.baselineFare,
      baselineSource: baseline.source,
      baselineCount: baseline.count,
      threshold: alert.threshold,
      delta: null,
      triggered: false,
      reason: "Current fare is unavailable.",
    };
  }

  if (!Number.isFinite(baseline.baselineFare)) {
    return {
      ...alert,
      currentFare,
      baselineFare: null,
      baselineSource: baseline.source,
      baselineCount: baseline.count,
      threshold: alert.threshold,
      delta: null,
      triggered: false,
      reason: "Baseline fare unavailable (generated stats CSV missing or no match).",
    };
  }

  const delta = Number((baseline.baselineFare - currentFare).toFixed(2));
  const triggered = delta >= alert.threshold;

  return {
    ...alert,
    currentFare,
    baselineFare: baseline.baselineFare,
    baselineSource: baseline.source,
    baselineCount: baseline.count,
    threshold: alert.threshold,
    delta,
    triggered,
    reason: triggered
      ? `Triggered: current fare is ${delta} below baseline.`
      : `Not triggered: current fare is ${delta} below baseline (threshold ${alert.threshold}).`,
  };
}

app.post("/api/price-alerts", async (req, res) => {
  try {
    const normalized = normalizePriceAlert(req.body || {});
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }

    const key = buildPriceAlertKey(normalized);
    if (priceAlertsStore.has(key)) {
      return res.status(409).json({ error: "Duplicate alert already exists for this route/date/airline." });
    }

    const id = crypto.randomUUID();
    const record = {
      id,
      ...normalized,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    priceAlertsStore.set(key, record);
    return res.status(201).json({ alert: record });
  } catch (err) {
    console.error("POST /api/price-alerts error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/price-alerts", (req, res) => {
  try {
    const userEmail = req.query.userEmail ? String(req.query.userEmail).trim().toLowerCase() : null;
    const alerts = Array.from(priceAlertsStore.values()).filter((a) => {
      if (!userEmail) return true;
      return a.userEmail === userEmail;
    });
    return res.json({ alerts, count: alerts.length });
  } catch (err) {
    console.error("GET /api/price-alerts error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.delete("/api/price-alerts/:id", (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    let deleted = null;
    for (const [key, alert] of priceAlertsStore.entries()) {
      if (alert.id === id) {
        deleted = alert;
        priceAlertsStore.delete(key);
        break;
      }
    }
    if (!deleted) {
      return res.status(404).json({ error: "Price alert not found." });
    }
    return res.json({ success: true, id: deleted.id });
  } catch (err) {
    console.error("DELETE /api/price-alerts/:id error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/price-alerts/evaluate", async (req, res) => {
  try {
    const userEmail = req.query.userEmail ? String(req.query.userEmail).trim().toLowerCase() : null;
    const overrideCurrentFareRaw = req.query.currentFare;
    const overrideCurrentFare =
      overrideCurrentFareRaw === undefined ? null : Number(overrideCurrentFareRaw);

    const alerts = Array.from(priceAlertsStore.values()).filter((a) => {
      if (!userEmail) return true;
      return a.userEmail === userEmail;
    });

    const evaluated = [];
    for (const alert of alerts) {
      const evalResult = await evaluatePriceAlert(
        alert,
        Number.isFinite(overrideCurrentFare) ? overrideCurrentFare : null
      );
      evaluated.push(evalResult);
    }

    return res.json({ alerts: evaluated, count: evaluated.length });
  } catch (err) {
    console.error("GET /api/price-alerts/evaluate error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// analysis endpoint
app.get("/analysis", (req, res) => {
  res.json({
    avg_price: 320,
    cheapest_city: "Dallas",
    busiest_month: "July"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});