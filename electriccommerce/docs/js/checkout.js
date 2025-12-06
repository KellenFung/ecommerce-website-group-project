// Decode JWT payload from localStorage token
function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT", e);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const summaryEl = document.getElementById("order-summary");
  const calcEl = document.getElementById("order-calculations");

  // ---------- NEW: AUTOFILL SHIPPING + PAYMENT ----------
  const token = localStorage.getItem("token");
  const user = parseJwt(token);

  // Prefill shipping info from JWT (if logged in)
  if (user) {
    const firstInput = document.getElementById("first-name");
    const lastInput = document.getElementById("last-name");
    const emailInput = document.getElementById("email");
    const addrInput = document.getElementById("address");

    if (firstInput && !firstInput.value) {
      firstInput.value = user.first_name || "";
    }
    if (lastInput && !lastInput.value) {
      lastInput.value = user.last_name || "";
    }
    if (emailInput && !emailInput.value) {
      emailInput.value = user.email || "";
    }
    if (addrInput && !addrInput.value && user.address) {
      addrInput.value = user.address;
    }
  }

  // Prefill card fields from default saved payment method (if any)
  if (token) {
    try {
      const defaultMethod = await api("/payment-methods/default");
      if (defaultMethod) {
        const cardNumberEl = document.getElementById("card-number");
        const expEl = document.getElementById("card-expiration");

        if (cardNumberEl && !cardNumberEl.value) {
          // Show masked card number
          cardNumberEl.value = "**** **** **** " + defaultMethod.lastFourDigits;
        }
        if (expEl && !expEl.value) {
          expEl.value = defaultMethod.expiryDate;
        }
      }
    } catch (err) {
      // 404 if no default card, 401 if not logged in, etc. -> ignore
      console.warn("No default payment method found or not logged in.", err);
    }
  }
  // ---------- END AUTOFILL BLOCK ----------

  // ---------- EXISTING CART / TOTALS LOGIC ----------
  try {
    const cart = await api("/cart");

    if (!cart.items.length) {
      summaryEl.textContent = "Your cart is empty.";
      calcEl.textContent = "";
      return;
    }

    let subtotal = 0;
    summaryEl.innerHTML = "";

    cart.items.forEach((item) => {
      const lineTotal = item.price * item.qty;
      subtotal += lineTotal;

      const div = document.createElement("div");
      div.textContent =
        item.productId + " x" + item.qty + ": $" + lineTotal.toFixed(2);
      summaryEl.appendChild(div);
    });

    const taxRate = 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    calcEl.innerHTML =
      "Subtotal: $" + subtotal.toFixed(2) + "<br>" +
      "Tax: $" + tax.toFixed(2) + "<br>" +
      "Total: $" + total.toFixed(2);
  } catch (e) {
    summaryEl.textContent = "Failed to load order.";
    calcEl.textContent = "";
  }

  const btn = document.getElementById("place-order");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const first = document.getElementById("first-name").value.trim();
    const last = document.getElementById("last-name").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone-number").value.trim();
    const email = document.getElementById("email").value.trim();
    const cardNumber = document.getElementById("card-number").value.trim();
    const exp = document.getElementById("card-expiration").value.trim();
    const cvv = document.getElementById("card-cvv").value.trim();

    if (!first || !last || !address || !phone || !email || !cardNumber || !exp || !cvv) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      const order = await api("/orders", { method: "POST" });
      await api("/payments/mock", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id }),
      });
      alert(
        "Order placed successfully! Order ID: " +
          order.id +
          "\nTotal: $" +
          order.total
      );
      window.location.href = "main.html";
    } catch (e) {
      alert("Failed to place order.");
    }
  });
});
