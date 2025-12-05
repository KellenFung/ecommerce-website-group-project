async function postJSON(path, body) {
  return api(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Clear all error messages
function clearErrors() {
  document.getElementById("firstNameError").textContent = "";
  document.getElementById("lastNameError").textContent = "";
  document.getElementById("emailError").textContent = "";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("password2Error").textContent = "";
  document.getElementById("regMsg").textContent = "";
  document.getElementById("regMsg").className = "muted";
  
  // Remove error styling
  document.getElementById("regFirstName").classList.remove("error");
  document.getElementById("regLastName").classList.remove("error");
  document.getElementById("regEmail").classList.remove("error");
  document.getElementById("regPassword").classList.remove("error");
  document.getElementById("regPassword2").classList.remove("error");
}

// Show error message below specific field
function showFieldError(fieldId, errorId, message) {
  const errorElement = document.getElementById(errorId);
  const fieldElement = document.getElementById(fieldId);
  
  errorElement.textContent = message;
  fieldElement.classList.add("error");
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Handle registration form submission
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  
  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const password2 = document.getElementById("regPassword2").value;
  const address = document.getElementById("regAddress").value.trim();
  const msg = document.getElementById("regMsg");

  let hasError = false;

  // Validate name
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

  // Validate email
  if (!email) {
    showFieldError("regEmail", "emailError", "Email is required");
    hasError = true;
  } else if (!isValidEmail(email)) {
    showFieldError("regEmail", "emailError", "Please enter a valid email address");
    hasError = true;
  }

  // Validate password
  if (!password) {
    showFieldError("regPassword", "passwordError", "Password is required");
    hasError = true;
  } else if (password.length < 8) {
    showFieldError("regPassword", "passwordError", "Password must be at least 8 characters");
    hasError = true;
  }

  // Validate confirm password
  if (!password2) {
    showFieldError("regPassword2", "password2Error", "Please confirm your password");
    hasError = true;
  } else if (password !== password2) {
    showFieldError("regPassword2", "password2Error", "Passwords do not match");
    hasError = true;
  }

  if (hasError) return;

try {
    await postJSON("/auth/register", {
      first_name: firstName,
      last_name:  lastName,
      email,
      password,
      address: address || null,
    });
    
    msg.className = "success";
    msg.textContent = "Account created successfully! Redirecting to login...";
    
    // Redirect to login page after 2 seconds
    setTimeout(() => {
      window.location.href = "loginauth.html";
    }, 2000);
    
  } catch (e) {
    msg.className = "error";
    
    // Handle specific error messages
    if (e.message.includes("Email already registered") || e.message.includes("409")) {
      showFieldError("regEmail", "emailError", "This email is already registered");
      msg.textContent = "Please use a different email or sign in instead.";
    } else {
      msg.textContent = e.message || "Registration failed. Please try again.";
    }
  }
});

// Real-time validation - clear errors when user starts typing
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
  
  // Clear error if user starts typing
  if (this.value) {
    document.getElementById("password2Error").textContent = "";
    this.classList.remove("error");
  }
  
  // Show mismatch error in real-time
  if (this.value && this.value.length >= password.length && this.value !== password) {
    showFieldError("regPassword2", "password2Error", "Passwords do not match");
  }
});

// Clear button
document.getElementById("regClear").addEventListener("click", () => {
  document.getElementById("regFirstName").value = "";
  document.getElementById("regLastName").value = "";
  document.getElementById("regEmail").value = "";
  document.getElementById("regPassword").value = "";
  document.getElementById("regPassword2").value = "";
  document.getElementById("regAddress").value = "";
  clearErrors();
});

// Check if already logged in
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = "main.html";
  }
});