/**
 * main.js - Main application logic and navigation
 * Handles navbar, authentication state, logout, and search
 */

document.addEventListener("DOMContentLoaded", async () => {
  const accountGreeting = document.getElementById("account-greeting");
  const accountLabel = document.getElementById("account-label");
  const accountLink = document.getElementById("account-link");
  const authLink = document.getElementById("auth-link");
  const authText = document.getElementById("auth-text");

  // Check authentication state by validating token
  const token = localStorage.getItem("token");
  let isLoggedIn = false;
  let user = null;

  if (token) {
    try {
      user = await authedApi("/account/me");
      isLoggedIn = true;
      console.log("User authenticated:", user.email);
    } catch (error) {
      console.log("Token validation failed, clearing auth state");
      localStorage.removeItem("token");
      isLoggedIn = false;
    }
  }

  if (isLoggedIn && user) {
    const firstName = user.first_name || "User";

    if (accountGreeting) {
      accountGreeting.textContent = `Welcome, ${firstName}!`;
    }
    if (accountLabel) {
      accountLabel.textContent = "Account";
    }
    if (accountLink) {
      accountLink.href = "dashboard.html";
      accountLink.onclick = null;
    }
    if (authText) {
      authText.textContent = "Logout";
    }
    if (authLink) {
      authLink.href = "#";
      authLink.onclick = (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
          localStorage.removeItem("token");
          alert("You have been logged out successfully.");
          window.location.href = "main.html";
        }
      };
    }

    const bigWelcomeText = document.querySelector('h2[style*="padding-left:20px"]');
    if (bigWelcomeText && bigWelcomeText.textContent.includes("By Mahir")) {
      bigWelcomeText.textContent = `Welcome, ${firstName}!`;
      bigWelcomeText.style.fontSize = "2.5em";
      bigWelcomeText.style.fontWeight = "bold";
      bigWelcomeText.style.color = "#2c3e50";
    }

  } else {
    // LOGGED OUT / GUEST STATE
    if (accountGreeting) {
      accountGreeting.textContent = "Welcome Guest!";
    }
    if (accountLabel) {
      accountLabel.textContent = "Sign in / Create";
    }
    if (accountLink) {
      accountLink.href = "loginauth.html";
      accountLink.onclick = null;
    }
    if (authText) {
      authText.textContent = "Login";
    }
    if (authLink) {
      accountLink.href = "loginauth.html";
      authLink.onclick = null;
    }
  }

  // PRODUCT SEARCH
  const searchForm = document.getElementById("search-box");
  const searchInput = document.getElementById("search-input");

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim().toLowerCase();
      const cards = document.querySelectorAll(".product-card");
      
      cards.forEach((card) => {
        const nameAttr = (card.dataset.name || "").toLowerCase();
        const overlayNameEl = card.querySelector(".product-name");
        const overlayName = overlayNameEl ? overlayNameEl.textContent.toLowerCase() : "";
        const name = nameAttr || overlayName;

        if (!query || name.includes(query)) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });

    searchInput.addEventListener("input", (e) => {
      if (e.target.value === "") {
        document.querySelectorAll(".product-card").forEach((card) => {
          card.style.display = "";
        });
      }
    });
  }

  //Slider functionality
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
  
});