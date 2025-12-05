async function postJSON(path, body) {
  return api(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Clear all error messages
function clearErrors() {
  document.getElementById("emailError").textContent = "";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("loginMsg").textContent = "";
  document.getElementById("loginMsg").className = "muted";
  
  // Remove error styling
  document.getElementById("loginEmail").classList.remove("error");
  document.getElementById("loginPassword").classList.remove("error");
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

// Handle login form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const msg = document.getElementById("loginMsg");
  
  let hasError = false;

  // Validate email
  if (!email) {
    showFieldError("loginEmail", "emailError", "Email is required");
    hasError = true;
  } else if (!isValidEmail(email)) {
    showFieldError("loginEmail", "emailError", "Please enter a valid email address");
    hasError = true;
  }

  // Validate password
  if (!password) {
    showFieldError("loginPassword", "passwordError", "Password is required");
    hasError = true;
  } else if (password.length < 8) {
    showFieldError("loginPassword", "passwordError", "Password must be at least 8 characters");
    hasError = true;
  }

  if (hasError) return;

  try {
    const data = await postJSON("/auth/login", { email, password });
    
    // Save token to localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    msg.className = "success";
    msg.textContent = "Login successful! Redirecting...";
    
    console.log("Logged in user:", data.user);
    
    // Redirect to main page after 1 second
    setTimeout(() => {
      window.location.href = "main.html";
    }, 1000);
    
  } catch (e) {
    msg.className = "error";
    msg.textContent = e.message || "Login failed. Please check your credentials.";
  }
});

// Real-time validation - clear error when user starts typing
document.getElementById("loginEmail").addEventListener("input", function() {
  if (this.value) {
    document.getElementById("emailError").textContent = "";
    this.classList.remove("error");
  }
});

document.getElementById("loginPassword").addEventListener("input", function() {
  if (this.value) {
    document.getElementById("passwordError").textContent = "";
    this.classList.remove("error");
  }
});

// Clear button
document.getElementById("loginClear").addEventListener("click", () => {
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
  clearErrors();
});

// Check if already logged in
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = "main.html";
  }
});