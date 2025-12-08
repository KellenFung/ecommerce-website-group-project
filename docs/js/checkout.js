document.addEventListener("DOMContentLoaded", async () => {
  //REQUIRE LOGIN
  try {
    await requireAuth();
  } catch (error) {
    return;
  }

  const summaryEl = document.getElementById("order-summary");
  const calcEl = document.getElementById("order-calculations");

  const firstInput = document.getElementById("first-name");
  const lastInput = document.getElementById("last-name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone-number");
  
  const streetInput = document.getElementById("street");
  const cityInput = document.getElementById("city");
  const stateInput = document.getElementById("state");
  const countryInput = document.getElementById("country");
  const zipInput = document.getElementById("zip");

  const cardNumberEl = document.getElementById("card-number");
  const expEl = document.getElementById("card-expiration");
  const cvvEl = document.getElementById("card-cvv");

  const touched = {
    first: false,
    last: false,
    email: false,
    phone: false,
    street: false,
    city: false,
    state: false,
    country: false,
    zip: false,
    cardNumber: false,
    exp: false,
    cvv: false,
  };

  if (firstInput) firstInput.addEventListener("input", () => (touched.first = true));
  if (lastInput) lastInput.addEventListener("input", () => (touched.last = true));
  if (emailInput) emailInput.addEventListener("input", () => (touched.email = true));
  if (phoneInput) phoneInput.addEventListener("input", () => (touched.phone = true));
  
  if (streetInput) streetInput.addEventListener("input", () => (touched.street = true));
  if (cityInput) cityInput.addEventListener("input", () => (touched.city = true));
  if (stateInput) stateInput.addEventListener("input", () => (touched.state = true));
  if (countryInput) countryInput.addEventListener("input", () => (touched.country = true));
  if (zipInput) zipInput.addEventListener("input", () => (touched.zip = true));
  
  if (cardNumberEl) cardNumberEl.addEventListener("input", () => (touched.cardNumber = true));
  if (expEl) expEl.addEventListener("input", () => (touched.exp = true));
  if (cvvEl) cvvEl.addEventListener("input", () => (touched.cvv = true));

  //AUTOFILL NAME, EMAIL, PHONE, ADDRESS FROM DATABASE
  try {
    const account = await authedApi("/account/me");
    console.log("Loaded account for checkout:", account);

    // First name
    if (firstInput && !touched.first && !firstInput.value && account.first_name) {
      firstInput.value = account.first_name;
    }

    // Last name
    if (lastInput && !touched.last && !lastInput.value && account.last_name) {
      lastInput.value = account.last_name;
    }

    // Email
    if (emailInput && !touched.email && !emailInput.value && account.email) {
      emailInput.value = account.email;
    }

    // Phone
    if (phoneInput && !touched.phone && !phoneInput.value) {
      const phoneNumber = account.phone || account.shipping_phone;
      if (phoneNumber) phoneInput.value = phoneNumber;
    }

    if (streetInput && !touched.street && !streetInput.value && account.shipping_street) {
      streetInput.value = account.shipping_street;
    }
    
    if (cityInput && !touched.city && !cityInput.value && account.shipping_city) {
      cityInput.value = account.shipping_city;
    }
    
    if (stateInput && !touched.state && !stateInput.value) {
      const stateValue = account.shipping_state;
      if (stateValue) stateInput.value = stateValue;
    }
    
    if (countryInput && !touched.country && !countryInput.value && account.shipping_country) {
      countryInput.value = account.shipping_country;
    }
    
    if (zipInput && !touched.zip && !zipInput.value && account.shipping_zip) {
      zipInput.value = account.shipping_zip;
    }

    console.log("Autofilled address fields");
  } catch (err) {
    console.warn("Could not load account for autofill:", err);
  }

  try {
    const defaultMethod = await authedApi("/payment-methods/default");

    if (defaultMethod) {
      console.log("✅ Loaded default payment method");

      // Card number (masked)
      if (cardNumberEl && !touched.cardNumber && !cardNumberEl.value) {
        const last4 = defaultMethod.lastFourDigits || defaultMethod.last4 || "****";
        cardNumberEl.value = "**** **** **** " + last4;
      }

      // Expiration
      if (expEl && !touched.exp && !expEl.value) {
        if (defaultMethod.expiryDate) {
          expEl.value = defaultMethod.expiryDate;
        } else if (defaultMethod.expMonth && defaultMethod.expYear) {
          const mm = String(defaultMethod.expMonth).padStart(2, "0");
          const yy = String(defaultMethod.expYear).slice(-2);
          expEl.value = `${mm}/${yy}`;
        }
      }

      // CVV
      if (cvvEl && !touched.cvv && !cvvEl.value && defaultMethod.cvv) {
        cvvEl.value = defaultMethod.cvv;
        console.log("✅ Autofilled CVV");
      }
    }
  } catch (err) {
    console.warn("No default payment method found:", err);
  }

  try {
    const cart = await authedApi("/cart");
    console.log("✅ Loaded cart:", cart);

    if (!cart.items || cart.items.length === 0) {
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
      div.textContent = `${item.productName || item.productId} x${item.qty}: $${lineTotal.toFixed(2)}`;
      summaryEl.appendChild(div);
    });

    const taxRate = 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    calcEl.innerHTML =
      `Subtotal: $${subtotal.toFixed(2)}<br>` +
      `Tax: $${tax.toFixed(2)}<br>` +
      `Total: $${total.toFixed(2)}`;
  } catch (e) {
    console.error("Failed to load cart:", e);
    summaryEl.textContent = "Failed to load order.";
    calcEl.textContent = "";
  }

  //PLACE ORDER
  const btn = document.getElementById("place-order");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const first = firstInput.value.trim();
    const last = lastInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    
    const street = streetInput.value.trim();
    const city = cityInput.value.trim();
    const state = stateInput.value.trim();
    const country = countryInput.value.trim();
    const zip = zipInput.value.trim();
    
    const cardNumber = cardNumberEl.value.trim();
    const exp = expEl.value.trim();
    const cvv = cvvEl.value.trim();

    if (!first || !last || !email || !phone || !street || !city || !state || !country || !zip || !cardNumber || !exp || !cvv) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      const fullAddress = `${street}, ${city}, ${state} ${zip}, ${country}`;
      
      // Create order
      const order = await authedApi("/orders", {
        method: "POST",
        body: JSON.stringify({
          shippingName: `${first} ${last}`,
          shippingEmail: email,
          shippingPhone: phone,
          shippingAddress: fullAddress, 
        }),
      });

      console.log("Order created:", order);

      // Process payment
      await authedApi("/payments/mock", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id }),
      });

      console.log("Payment processed for order:", order.id);

      alert(
        `Order placed successfully!\nOrder ID: ${order.id}\nTotal: $${order.total.toFixed(2)}`
      );
      window.location.href = "main.html";
    } catch (e) {
      console.error("Failed to place order:", e);
      alert("Failed to place order: " + e.message);
    }
  });
});