/**
 * registerauth.js - User registration handler
 */

async function postJSON(path, body) {
  return api(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function clearErrors() {
  document.getElementById("firstNameError").textContent = "";
  document.getElementById("lastNameError").textContent = "";
  document.getElementById("emailError").textContent = "";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("password2Error").textContent = "";
  const msg = document.getElementById("regMsg");
  msg.textContent = "";
  msg.className = "muted";
  msg.style.display = "none";
  
  document.getElementById("regFirstName").classList.remove("error");
  document.getElementById("regLastName").classList.remove("error");
  document.getElementById("regEmail").classList.remove("error");
  document.getElementById("regPassword").classList.remove("error");
  document.getElementById("regPassword2").classList.remove("error");
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  
  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value;
  const password2 = document.getElementById("regPassword2").value;
  const address = document.getElementById("regAddress").value.trim();
  const msg = document.getElementById("regMsg");
  let hasError = false;

  if (!firstName) {
    showFieldError("regFirstName", "firstNameError", "First name is required");
    hasError = true;
  } else if (firstName.length < 2) {
    showFieldError("regFirstName", "firstNameError", "First name must be at least 2 characters");
    hasError = true;
  }

  if (!lastName) {
    showFieldError("regLastName", "lastNameError", "Last name is required");
    hasError = true;
  } else if (lastName.length < 2) {
    showFieldError("regLastName", "lastNameError", "Last name must be at least 2 characters");
    hasError = true;
  }

  if (!email) {
    showFieldError("regEmail", "emailError", "Email is required");
    hasError = true;
  } else if (!isValidEmail(email)) {
    showFieldError("regEmail", "emailError", "Please enter a valid email address");
    hasError = true;
  }

  if (!password) {
    showFieldError("regPassword", "passwordError", "Password is required");
    hasError = true;
  } else if (password.length < 8) {
    showFieldError("regPassword", "passwordError", "Password must be at least 8 characters");
    hasError = true;
  }

  if (!password2) {
    showFieldError("regPassword2", "password2Error", "Please confirm your password");
    hasError = true;
  } else if (password !== password2) {
    showFieldError("regPassword2", "password2Error", "Passwords do not match");
    hasError = true;
  }

  if (hasError) return;

  const submitBtn = document.getElementById("registerBtn");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    // Database will reject if email already exists (UNIQUE constraint)
    await postJSON("/auth/register", {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      address: address || null,
    });
    
    msg.className = "success";
    msg.style.display = "block";
    msg.textContent = "✓ Account created successfully! Redirecting to login...";
    console.log("✓ New account created for:", email);
    
    document.getElementById("registerForm").reset();
    
    setTimeout(() => {
      window.location.href = "loginauth.html";
    }, 2000);
    
  } catch (e) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    
    msg.className = "error";
    msg.style.display = "block";
    
    const errorMessage = e.message.toLowerCase();
    
    if (errorMessage.includes("email already registered") || 
        errorMessage.includes("409") || 
        errorMessage.includes("duplicate") ||
        errorMessage.includes("already exists")) {
      showFieldError("regEmail", "emailError", "This email is already registered");
      msg.textContent = "✗ This email is already registered. Please use a different email or sign in instead.";
      
      msg.innerHTML = `
        ✗ This email is already registered. 
        <a href="loginauth.html" style="color: #007bff; text-decoration: underline;">
          Click here to sign in instead
        </a>
      `;
    }
    else if (errorMessage.includes("network")) {
      msg.textContent = "✗ Unable to connect to server. Please check your internet connection.";
    }
    else if (errorMessage.includes("server error")) {
      msg.textContent = "✗ Server error. Please try again in a few moments.";
    }
    else {
      msg.textContent = "✗ " + (e.message || "Registration failed. Please try again.");
    }
    
    console.error("Registration failed:", e);
  }
});

document.getElementById("regFirstName").addEventListener("input", function () {
  if (this.value) {
    document.getElementById("firstNameError").textContent = "";
    this.classList.remove("error");
  }
});

document.getElementById("regLastName").addEventListener("input", function () {
  if (this.value) {
    document.getElementById("lastNameError").textContent = "";
    this.classList.remove("error");
  }
});

document.getElementById("regEmail").addEventListener("input", function() {
  if (this.value) {
    document.getElementById("emailError").textContent = "";
    this.classList.remove("error");
    const msg = document.getElementById("regMsg");
    if (msg.className === "error") {
      msg.style.display = "none";
    }
  }
});

document.getElementById("regPassword").addEventListener("input", function() {
  if (this.value) {
    document.getElementById("passwordError").textContent = "";
    this.classList.remove("error");
  }
});

document.getElementById("regPassword2").addEventListener("input", function() {
  const password = document.getElementById("regPassword").value;
  
  if (this.value) {
    document.getElementById("password2Error").textContent = "";
    this.classList.remove("error");
  }
  
  if (this.value && this.value.length >= password.length && this.value !== password) {
    showFieldError("regPassword2", "password2Error", "Passwords do not match");
  }
});

document.getElementById("regClear").addEventListener("click", () => {
  document.getElementById("registerForm").reset();
  clearErrors();
});

window.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await authedApi('/account/me');
      console.log('✓ Already logged in, redirecting to main page');
      window.location.href = "main.html";
    } catch (error) {
      localStorage.removeItem('token');
    }
  }
});