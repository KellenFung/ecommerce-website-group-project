document.addEventListener("DOMContentLoaded", async () => {
  await updateCartBadge();
  setupProductCards();
  document.querySelectorAll(".slider-container").forEach(container =>{
    const slider = container.querySelector(".slider")
    const card = container.querySelector(".card")
    const leftBtn = container.querySelector(".left")
    const rightBtn = container.querySelector(".right")

    rightBtn.addEventListener("click", ()=>{
      const containerWidth = slider.parentElement.clientWidth
      slider.scrollBy({left: containerWidth, behavior: "smooth"})
    })

    leftBtn.addEventListener("click", ()=>{
      const containerWidth = slider.parentElement.clientWidth
      slider.scrollBy({left: -containerWidth, behavior: "smooth"})
    })
  })
  
  acctBtn = document.getElementById("account-box");

  acctBtn.addEventListener("click", async () => {
    const response = api("/account");
    window.location.href = `/${response.userID}`;
  })


  const acctBtn = document.getElementById("account-box");
  if (acctBtn) {
    acctBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }
});
