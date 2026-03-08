(function () {
  "use strict";

  // ---- Storage key (change if you want per-user login) ----
  // If you have a real auth system, replace "demoUser" with the logged-in user id/email.
  const USER_KEY = localStorage.getItem("flightSight_userKey") || "demoUser";
  const STORAGE_KEY = `flightSight_chatlog_${USER_KEY}`;

  // ---- UI elements ----
  const el = {
    goal: document.getElementById("aiGoal"),
    constraints: document.getElementById("aiConstraints"),
    style: document.getElementById("aiStyle"),
    buildPromptBtn: document.getElementById("aiBuildPromptBtn"),
    chips: document.getElementById("aiChips"),
    exportBtn: document.getElementById("aiExportBtn"),
    clearBtn: document.getElementById("aiClearBtn"),
    status: document.getElementById("aiStatus"),

    messages: document.getElementById("aiMessages"),
    input: document.getElementById("aiInput"),
    sendBtn: document.getElementById("aiSendBtn"),
    hints: document.getElementById("aiHints"),
  };

  if (!el.messages || !el.input || !el.sendBtn) return;

  // ---- Helpers ----
  function nowISO() {
    return new Date().toISOString();
  }

  function loadLog() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLog(log) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    el.status && (el.status.textContent = `Saved (${log.length} messages) for ${USER_KEY}`);
  }

  function pushMessage(role, text, extra = {}) {
    const log = loadLog();
    log.push({
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
      role,
      text: String(text || "").trim(),
      ts: nowISO(),
      ...extra,
    });
    saveLog(log);
    render(log);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  function render(log) {
    el.messages.innerHTML = "";
    log.forEach((m) => {
      const wrap = document.createElement("div");
      wrap.className = `ai-msg ${m.role === "user" ? "user" : "assistant"}`;

      const bubble = document.createElement("div");
      bubble.className = "ai-bubble";
      bubble.innerHTML = `
        <div>${escapeHtml(m.text)}</div>
        <div class="ai-meta">${m.role} • ${escapeHtml(formatTime(m.ts))}</div>
      `;

      wrap.appendChild(bubble);
      el.messages.appendChild(wrap);
    });

    // scroll to bottom
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  // ---- “Further suggestions” logic ----
  const suggestionRules = [
    {
      match: /cheap|budget|under\s*\$|price/i,
      hint: "Try: “Rank options by price, then break ties by safety rating.”",
    },
    {
      match: /safe|safety/i,
      hint: "Try: “Prioritize safety rating ≥ 9.0 and explain the tradeoffs.”",
    },
    {
      match: /environment|eco|co2|green/i,
      hint: "Try: “Prefer highest environmental score; show top 2 and why.”",
    },
    {
      match: /seat|availability|full/i,
      hint: "Try: “Filter seat availability to High/Moderate only; show best value.”",
    },
    {
      match: /compare|versus|vs/i,
      hint: "Try: “Compare Flight A vs Flight B across price, safety, environment, duration.”",
    },
  ];

  function updateHints(text) {
    const t = String(text || "");
    const hits = suggestionRules.filter((r) => r.match.test(t)).map((r) => r.hint);
    el.hints.textContent = hits.length ? hits[0] : "Tip: Use Goal + Constraints to build strong prompts.";
  }

  // ---- Quick prompt chips (prompt engineering helpers) ----
  const chips = [
    "Compare two airlines and explain tradeoffs.",
    "Rank saved flights by best value (safety + price).",
    "Prefer nonstop + lowest price under $500.",
    "Optimize for environmental score first, then safety.",
    "Summarize in 3 bullets + recommendation.",
  ];

  function initChips() {
    if (!el.chips) return;
    el.chips.innerHTML = "";
    chips.forEach((text) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ai-chip";
      b.textContent = text;
      b.addEventListener("click", () => {
        el.input.value = text;
        el.input.focus();
        updateHints(text);
      });
      el.chips.appendChild(b);
    });
  }

  // ---- Build prompt (prompt engineer → chat input) ----
  function buildPrompt() {
    const goal = el.goal?.value?.trim();
    const constraints = el.constraints?.value?.trim();
    const style = el.style?.value || "concise";

    const parts = [];
    if (goal) parts.push(`Goal: ${goal}`);
    if (constraints) parts.push(`Constraints: ${constraints}`);
    parts.push(`Output style: ${style}`);

    // This is the “prompt engineered” message the user sends.
    const prompt = parts.join("\n");
    el.input.value = prompt;
    el.input.focus();
    updateHints(prompt);
  }

  // ---- Send message (demo assistant response) ----
  // Replace this block later with your real recommendation engine / API call.
  function fakeAssistantResponse(userText) {
    // You can wire this to your compare data / saved flights data later.
    // For now it demonstrates “further suggestions” and preserved chat logs.
    const suggestions = [
      "If you want a tighter result, add a budget and a minimum safety rating.",
      "Ask me to rank flights by: price, safety, environmental, duration, seat availability.",
      "If comparing airlines, specify: ‘A vs B’ and which metrics matter most.",
    ];

    const response =
      `Got it. I saved your request.\n\n` +
      `Next refinements you can try:\n` +
      `• ${suggestions[0]}\n` +
      `• ${suggestions[1]}\n` +
      `• ${suggestions[2]}\n\n` +
      `If you want, paste: “Use my saved flights and recommend the best option.”`;

    return response;
  }

  function send() {
    const text = el.input.value.trim();
    if (!text) return;

    pushMessage("user", text);
    el.input.value = "";
    updateHints("");

    // demo assistant
    const reply = fakeAssistantResponse(text);
    pushMessage("assistant", reply, { model: "demo" });
  }

  // ---- Export / Clear ----
  function exportLog() {
    const log = loadLog();
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `flightSight_chatlog_${USER_KEY}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function clearLog() {
    localStorage.removeItem(STORAGE_KEY);
    render([]);
    el.status && (el.status.textContent = `Cleared log for ${USER_KEY}`);
  }

  // ---- Init ----
  function init() {
    const log = loadLog();
    render(log);
    initChips();
    updateHints("");

    el.sendBtn.addEventListener("click", send);
    el.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
    el.input.addEventListener("input", (e) => updateHints(e.target.value));

    el.buildPromptBtn?.addEventListener("click", buildPrompt);
    el.exportBtn?.addEventListener("click", exportLog);
    el.clearBtn?.addEventListener("click", clearLog);

    el.status && (el.status.textContent = `Loaded (${log.length} messages) for ${USER_KEY}`);
  }

  document.addEventListener("DOMContentLoaded", init);
})();