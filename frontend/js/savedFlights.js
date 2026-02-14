// Delete flight card
document.querySelectorAll(".delete-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".flight-card");
    card.style.opacity = "0";
    setTimeout(() => {
      card.remove();
    }, 300);
  });
});

// View button action
document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    alert("Opening flight details...");
  });
});
