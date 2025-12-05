document.addEventListener("DOMContentLoaded", async () => {
  await updateCartBadge();
  setupProductCards();

  document.querySelectorAll(".slider-container").forEach(container => {
    const slider = container.querySelector(".slider");
    const leftBtn = container.querySelector(".left");
    const rightBtn = container.querySelector(".right");

    rightBtn.addEventListener("click", () => {
      const containerWidth = slider.parentElement.clientWidth;
      slider.scrollBy({ left: containerWidth, behavior: "smooth" });
    });

    leftBtn.addEventListener("click", () => {
      const containerWidth = slider.parentElement.clientWidth;
      slider.scrollBy({ left: -containerWidth, behavior: "smooth" });
    });
  });

  const acctBtn = document.getElementById("account-box");

  if (acctBtn) {
    acctBtn.addEventListener("click", async () => {
      try {
        
        window.location.href = "dashboard.html";
      } catch (err) {
        console.error("Account button error:", err);
      }
    });
  }
});

