// Animate progress bars
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".progress-fill").forEach(bar => {
    const score = bar.getAttribute("data-score");
    setTimeout(() => {
      bar.style.width = score + "%";
    }, 200);
  });
});

// Filter Tabs
const tabs = document.querySelectorAll(".tab");
const cards = document.querySelectorAll(".airline-card");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {

    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const filter = tab.dataset.filter;

    cards.forEach(card => {
      const categories = card.dataset.category;

      if (filter === "all" || categories.includes(filter)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });

  });
});
