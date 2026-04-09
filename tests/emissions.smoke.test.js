const assert = require("assert");
const { spawn } = require("child_process");

const BASE_URL = "http://localhost:3000";
const SERVER_START_TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

async function serverAlreadyRunning() {
  try {
    const { ok } = await getJson("/emissions");
    return ok;
  } catch {
    return false;
  }
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server.js"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error("Timed out waiting for server startup."));
    }, SERVER_START_TIMEOUT_MS);

    const onData = (chunk) => {
      const text = String(chunk);
      if (text.includes("Server running on")) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(child);
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (code ${code}).`));
    });
  });
}

async function run() {
  let child = null;
  let startedByTest = false;

  try {
    if (!(await serverAlreadyRunning())) {
      child = await startServer();
      startedByTest = true;
      await sleep(300);
    }

    const routeCase = await getJson("/emissions?origin=LAX&destination=SFO");
    assert.strictEqual(routeCase.ok, true, "Route request should return 200");
    assert.strictEqual(typeof routeCase.data.co2, "number", "co2 should be a number");
    assert.strictEqual(Number.isInteger(routeCase.data.co2), true, "co2 should be an integer");
    assert.strictEqual(routeCase.data.co2 > 0, true, "co2 should be positive");
    assert.strictEqual(typeof routeCase.data.airline, "string", "airline should be a string");
    assert.strictEqual(routeCase.data.airline.length > 0, true, "airline should not be empty");

    const fallbackCase = await getJson("/emissions");
    assert.strictEqual(fallbackCase.ok, true, "Fallback request should return 200");
    assert.strictEqual(typeof fallbackCase.data.co2, "number", "fallback co2 should be a number");
    assert.strictEqual(fallbackCase.data.co2 >= 180 && fallbackCase.data.co2 <= 320, true, "fallback co2 should be in expected random range 180-320");
    assert.strictEqual(typeof fallbackCase.data.airline, "string", "fallback airline should be a string");

    console.log("PASS: Emissions endpoint smoke test completed.");
    console.log("Route case:", routeCase.data);
    console.log("Fallback case:", fallbackCase.data);
    process.exitCode = 0;
  } catch (err) {
    console.error("FAIL: Emissions endpoint smoke test failed.");
    console.error(err?.stack || err);
    process.exitCode = 1;
  } finally {
    if (startedByTest && child && !child.killed) {
      child.kill();
    }
  }
}

run();