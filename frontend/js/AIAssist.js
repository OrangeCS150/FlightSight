// frontend/js/AIAssist.js
document.addEventListener("DOMContentLoaded", () => {
  initAIAssistant();
});

function initAIAssistant() {
  const aiButton = document.getElementById("ai-button");
  const aiBox = document.getElementById("ai-box");
  const aiClose = document.getElementById("ai-close");
  const aiInput = document.getElementById("ai-input");
  const aiSend = document.getElementById("ai-send");
  const aiMessages = document.querySelector(".ai-messages");

  // Defensive: if assistant HTML isn't on the page, do nothing
  if (!aiButton || !aiBox || !aiClose || !aiMessages) return;

  // Stagger quick buttons by setting CSS var --i
  const quickButtons = aiBox.querySelectorAll(".ai-quick-btn");
  quickButtons.forEach((btn, i) => {
    btn.style.setProperty("--i", i);
  });

  /* -----------------------
     Open / Close behavior
     ----------------------- */
  function openAssistant() {
    aiBox.classList.remove("hidden");
    // trigger animations on next frame
    requestAnimationFrame(() => aiBox.classList.add("is-open"));
    if (aiInput) setTimeout(() => aiInput.focus(), 180);
  }

  function closeAssistant() {
    aiBox.classList.remove("is-open");
    // hide after transition
    setTimeout(() => aiBox.classList.add("hidden"), 220);
  }

  aiButton.addEventListener("click", () => {
    const isHidden = aiBox.classList.contains("hidden");
    if (isHidden) openAssistant();
    else closeAssistant();
  });

  aiClose.addEventListener("click", closeAssistant);

  /* -----------------------
     Message helpers + UI
     ----------------------- */

  // appendMessage: create a bubble and return the element
  function appendMessage(role, text = "", isTyping = false) {
    // role: "You" or "Assistant"
    const message = document.createElement("div");
    message.classList.add("ai-message");
    message.classList.add(role === "You" ? "user" : "assistant");

    // remove placeholder the first time a real message appears
    const placeholder = aiMessages.querySelector(".ai-placeholder");
    if (placeholder) placeholder.remove();

    if (isTyping) {
      message.classList.add("typing");
      message.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    } else {
      message.textContent = text;
    }

    aiMessages.appendChild(message);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return message;
  }

  // typewriter effect: type fullText into the element one character at a time
  function typeTextIntoElement(el, fullText, speed = 20) {
    return new Promise((resolve) => {
      // clear and ensure assistant class present
      el.textContent = "";
      el.classList.remove("typing");
      el.classList.add("assistant");
      let i = 0;
      const timer = setInterval(() => {
        // append char
        el.textContent += fullText.charAt(i);
        i++;
        // keep scrolled to bottom as typing proceeds
        aiMessages.scrollTop = aiMessages.scrollHeight;
        if (i >= fullText.length) {
          clearInterval(timer);
          // mark typed so CSS can hide caret
          el.classList.add("typed");
          resolve();
        }
      }, speed);
    });
  }

  /* -----------------------
     Send message flow
     ----------------------- */
  async function sendMessage() {
    if (!aiInput) return;
    const text = aiInput.value.trim();
    if (!text) return;

    // 1) Append user message
    appendMessage("You", text);
    aiInput.value = "";

    // 2) Show typing bubble (three dots) while waiting for server
    const typingBubble = appendMessage("Assistant", "", true);

    try {
      // 3) Call backend
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      // if network-level failure, this will throw in catch
      const data = await res.json();
      const replyText = (data && data.reply) ? data.reply : "Sorry — I couldn't answer that.";

      // 4) Replace typing bubble with typed reply (typewriter)
      // small pause to make it feel natural
      await new Promise((r) => setTimeout(r, 180));

      await typeTextIntoElement(typingBubble, replyText, 20);

    } catch (err) {
      // remove typing indicator and show error
      if (typingBubble) typingBubble.remove();
      appendMessage("Assistant", "Error connecting to AI server.");
      console.error("AI fetch failed:", err);
    }
  }


  if (aiSend && aiInput) {
    aiSend.addEventListener("click", sendMessage);
    aiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  // close when clicking outside (but not when clicking the open button)
  document.addEventListener("click", (e) => {
    if (aiBox.classList.contains("hidden")) return;
    const clickedInside = aiBox.contains(e.target);
    const clickedButton = aiButton.contains(e.target);
    if (!clickedInside && !clickedButton) closeAssistant();
  });

  // expose for debugging (optional)
  window._aiAssistant = {
    sendMessage,
    appendMessage,
    openAssistant,
    closeAssistant,
  };
}
