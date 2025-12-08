document.addEventListener("DOMContentLoaded", async () => {
  //REQUIRE AUTHENTICATION
  try {
    await requireAuth();
  } catch (error) {
    return;
  }

  // Load existing address FROM DATABASE
  try {
    const account = await authedApi("/account/me");
    console.log("Loaded account data:", account);

    // Load all address fields
    if (account.shipping_street) {
      document.getElementById("street-input").value = account.shipping_street;
    }
    if (account.shipping_city) {
      document.getElementById("city-input").value = account.shipping_city;
    }
    
    // Load state/province (try both fields for backward compatibility)
    const stateValue = account.shipping_state || "";
    if (stateValue) {
      document.getElementById("state-input").value = stateValue;
    }
    
    if (account.shipping_country) {
      document.getElementById("country-input").value = account.shipping_country;
    }
    if (account.shipping_zip) {
      document.getElementById("zip-input").value = account.shipping_zip;
    }

  } catch (err) {
    console.error("Failed to load address:", err);
    alert("Could not load address information: " + err.message);
  }

  // Save buttons
  document.querySelectorAll(".save-changes").forEach((btn) => {
    btn.addEventListener("click", async (evt) => {
      evt.preventDefault();
      await saveAddress();
    });
  });
});

async function saveAddress() {
  const stateValue = document.getElementById("state-input").value.trim();
  
  const payload = {
    shipping_street: document.getElementById("street-input").value.trim(),
    shipping_city: document.getElementById("city-input").value.trim(),
    shipping_state: stateValue,    
    shipping_country: document.getElementById("country-input").value.trim(),
    shipping_zip: document.getElementById("zip-input").value.trim(),
  };

  console.log("Saving address data:", payload);

  try {
    const response = await authedApi("/account/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    
    console.log("Save response:", response);
    alert("Address saved successfully!");
  } catch (err) {
    console.error("Failed to save address:", err);
    alert("Could not save address: " + err.message);
  }
}