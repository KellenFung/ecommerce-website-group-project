/**
 * dashboard.js - FIXED VERSION
 * Loads user name from database and displays welcome message
 */

document.addEventListener("DOMContentLoaded", async () => {
  //Load user info from database
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const account = await authedApi("/account/me");
      
      // Update welcome message
      const greetingEl = document.getElementById("account-greeting");
      if (greetingEl && account.first_name) {
        greetingEl.textContent = `Welcome, ${account.first_name}!`;
      }
    }
    await updateCartBadge();
  } catch (err) {
    console.error("Failed to load user info:", err);
  }

  // Login & Security 
  const loginBox = document.getElementById("login-security");
  if (loginBox) {
    loginBox.addEventListener("click", () => {
      window.location.href = "login-edit.html";
    });
  }

  // Order History 
  const orderBox = document.getElementById("order-history");
  if (orderBox) {
    orderBox.addEventListener("click", () => {
      window.location.href = "orderhistory.html";
    });
  }

  // Address 
  const addressBox = document.getElementById("address");
  if (addressBox) {
    addressBox.addEventListener("click", () => {
      window.location.href = "address-edit.html";
    });
  }

  // Payment Options
  const paymentBox = document.getElementById("payment");
  if (paymentBox) {
    paymentBox.addEventListener("click", () => {
      window.location.href = "paymentsystem.html";
    });
  }

 // Customer Service
const customerServiceBox = document.getElementById("customer-service");
if (customerServiceBox) {
    customerServiceBox.addEventListener("click", () => {
        window.location.href = "customer-service.html";
    });
}

  // "Your Account" title to go back to main page
  const title = document.getElementById("account-title");
  if (title) {
    title.addEventListener("click", () => {
      window.location.href = "main.html";
    });
  }
});