document.addEventListener("DOMContentLoaded", () => { 
  const aiButton = document.getElementById("ai-button");
  const aiBox = document.getElementById("ai-box");
  const aiClose = document.getElementById("ai-close");
  const aiInput = document.getElementById("ai-input");
  const aiSend = document.getElementById("ai-send");
  const aiMessages = document.querySelector(".ai-messages");

  if (aiButton && aiBox && aiClose && aiInput && aiSend && aiMessages) {
    aiButton.addEventListener("click", () => {
      aiBox.classList.toggle("hidden");
    });

    aiClose.addEventListener("click", () => {
      aiBox.classList.add("hidden");
    });

    aiSend.addEventListener("click", () => {
      const text = aiInput.value.trim();
      if (!text) return;

      const userMsg = document.createElement("p");
      userMsg.textContent = "You: " + text;
      aiMessages.appendChild(userMsg);

      aiInput.value = "";

      const reply = document.createElement("p");
      reply.textContent = "Assistant: (I’m not connected yet, but I will be!)";
      reply.style.opacity = "0.7";
      aiMessages.appendChild(reply);

      aiMessages.scrollTop = aiMessages.scrollHeight;

    });
    }
});
