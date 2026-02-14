document.addEventListener("DOMContentLoaded", () => {
  // If you're injecting the assistant via assistantLoader.js,
  // the HTML will exist by now. This init is still defensive.
  initAIAssistant();
});

function initAIAssistant() {
  const aiButton = document.getElementById("ai-button");
  const aiBox = document.getElementById("ai-box");
  const aiClose = document.getElementById("ai-close");
  const aiInput = document.getElementById("ai-input");
  const aiSend = document.getElementById("ai-send");
  const aiMessages = document.querySelector(".ai-messages");

  // If the assistant isn't on this page, do nothing.
  if (!aiButton || !aiBox || !aiClose) return;

  // Stagger animation for quick buttons (set CSS var --i)
  const quickButtons = aiBox.querySelectorAll(".ai-quick-btn");
  quickButtons.forEach((btn, i) => {
    btn.style.setProperty("--i", i);
  });

  // --- Open / Close with animation ---
  function openAssistant() {
    // Show (remove display:none)
    aiBox.classList.remove("hidden");

    // Next frame, trigger transitions (opacity/transform + button stagger)
    requestAnimationFrame(() => {
      aiBox.classList.add("is-open");
    });

    // Focus input if present
    if (aiInput) setTimeout(() => aiInput.focus(), 200);
  }

  function closeAssistant() {
    // Start closing transition
    aiBox.classList.remove("is-open");

    // After transition finishes, hide
    setTimeout(() => {
      aiBox.classList.add("hidden");
    }, 220);
  }

  aiButton.addEventListener("click", () => {
    const isHidden = aiBox.classList.contains("hidden");
    if (isHidden) openAssistant();
    else closeAssistant();
  });

  aiClose.addEventListener("click", closeAssistant);

  // --- Chat send behavior (same as before, but kept clean) ---
function appendMessage(role, text, isTyping = false) {
  const message = document.createElement("div");
  message.classList.add("ai-message");
  message.classList.add(role === "You" ? "user" : "assistant");

  if (isTyping) {
    message.classList.add("typing");
    message.innerHTML = `
      <span></span><span></span><span></span>
    `;
  } else {
    message.textContent = text;
  }

  aiMessages.appendChild(message);
  aiMessages.scrollTop = aiMessages.scrollHeight;

  return message;
}


async function sendMessage() {
  const text = aiInput.value.trim();
  if (!text) return;

  appendMessage("You", text);
  aiInput.value = "";

  // Show typing animation
  const typingBubble = appendMessage("Assistant", "", true);

  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await response.json();

    // Remove typing bubble
    typingBubble.remove();

    // Add real response with small delay
    setTimeout(() => {
      appendMessage("Assistant", data.reply);
    }, 400);

  } catch (err) {
    typingBubble.remove();
    appendMessage("Assistant", "Error connecting to AI server.");
  }
}


  if (aiSend && aiInput) {
    aiSend.addEventListener("click", sendMessage);

    aiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  // Optional: close when clicking outside the box (nice UX)
  document.addEventListener("click", (e) => {
    if (aiBox.classList.contains("hidden")) return;
    const clickedInside = aiBox.contains(e.target);
    const clickedButton = aiButton.contains(e.target);
    if (!clickedInside && !clickedButton) closeAssistant();
  });
}
