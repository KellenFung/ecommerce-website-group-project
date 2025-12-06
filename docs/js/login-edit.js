const API_URL = "http://127.0.0.1:8000/api";

// Get JWT token from localStorage
function getAuthToken() {
  return localStorage.getItem("token");
}

// If not logged in, send user to login page
function requireAuth() {
  const token = getAuthToken();
  if (!token) {
    alert("Please sign in to edit your account.");
    window.location.href = "loginauth.html";
    return null;
  }
  return token;
}

// Generic helper to call the account API (GET/PUT)
async function accountRequest(method, body) {
  const token = requireAuth();
  if (!token) throw new Error("Not authenticated");

  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(`${API_URL}/account/me`, options);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Request failed with ${resp.status}`);
  }
  return resp.json();
}

// Load existing user data into the inputs
async function loadAccountInfo() {
  try {
    const data = await accountRequest("GET");

    // These keys come from the backend /api/account/me response
    document.getElementById("first-name-input").value = data.first_name || "";
    document.getElementById("last-name-input").value = data.last_name || "";
    document.getElementById("email-input").value = data.email || "";
    document.getElementById("phone-input").value = data.shipping_phone || "";
    // We never fill password input for security reasons
    document.getElementById("password-input").value = "";
  } catch (err) {
    console.error("Failed to load account info:", err);
    alert("Could not load account information.");
  }
}

// Show a small success alert
function showSaved(fieldLabel) {
  alert(fieldLabel + " updated successfully.");
}

// Wire up buttons to update one field at a time
function setupSaveButtons() {
  const firstNameBtn = document.querySelectorAll(".save-changes")[0];
  const lastNameBtn  = document.querySelectorAll(".save-changes")[1];
  const emailBtn     = document.querySelectorAll(".save-changes")[2];
  const phoneBtn     = document.querySelectorAll(".save-changes")[3];
  const passwordBtn  = document.querySelectorAll(".save-changes")[4];

  // First name
  firstNameBtn.addEventListener("click", async () => {
    const value = document.getElementById("first-name-input").value.trim();
    if (!value) {
      alert("First name cannot be empty.");
      return;
    }
    if (value.length < 2) {
      alert("First name must be at least 2 characters.");
      return;
    }
    try {
      await accountRequest("PUT", { first_name: value });
      showSaved("First name");
    } catch (err) {
      console.error(err);
      alert("Failed to update first name.");
    }
  });

  // Last name
  lastNameBtn.addEventListener("click", async () => {
    const value = document.getElementById("last-name-input").value.trim();
    if (!value) {
      alert("Last name cannot be empty.");
      return;
    }
    if (value.length < 2) {
      alert("Last name must be at least 2 characters.");
      return;
    }
    try {
      await accountRequest("PUT", { last_name: value });
      showSaved("Last name");
    } catch (err) {
      console.error(err);
      alert("Failed to update last name.");
    }
  });

  // Email
  emailBtn.addEventListener("click", async () => {
    const value = document.getElementById("email-input").value.trim();
    if (!value) {
      alert("Email cannot be empty.");
      return;
    }
    // very light email check; backend will also validate
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      alert("Please enter a valid email address.");
      return;
    }
    try {
      await accountRequest("PUT", { email: value });
      showSaved("Email");
      // Note: token will still have old email until the user re-logs in, which is fine.
    } catch (err) {
      console.error(err);
      if (String(err.message).includes("1062") || String(err.message).includes("Duplicate")) {
        alert("That email is already in use.");
      } else {
        alert("Failed to update email.");
      }
    }
  });

  // Phone number (stored in shipping_phone)
  phoneBtn.addEventListener("click", async () => {
    const value = document.getElementById("phone-input").value.trim();
    if (!value) {
      alert("Phone number cannot be empty.");
      return;
    }
    try {
      await accountRequest("PUT", { shipping_phone: value });
      showSaved("Phone number");
    } catch (err) {
      console.error(err);
      alert("Failed to update phone number.");
    }
  });

  // Password
  passwordBtn.addEventListener("click", async () => {
    const value = document.getElementById("password-input").value;
    if (!value) {
      alert("Password cannot be empty.");
      return;
    }
    if (value.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    try {
      await accountRequest("PUT", { password: value });
      showSaved("Password");
      document.getElementById("password-input").value = "";
    } catch (err) {
      console.error(err);
      alert("Failed to update password.");
    }
  });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) return;
  loadAccountInfo();
  setupSaveButtons();
});
