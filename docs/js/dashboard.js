document.addEventListener("DOMContentLoaded", () => {
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

  // "Your Account" title to go back to main page
  const title = document.getElementById("account-title");
  if (title) {
    title.addEventListener("click", () => {
      window.location.href = "main.html";
    });
  }
});
