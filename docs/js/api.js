

const API_BASE = "http://127.0.0.1:8000/api";

// Default headers for all requests
const headers = {
  "Content-Type": "application/json",
};


async function api(path, opts = {}) {
  const url = API_BASE + path;
  const config = {
    ...opts,
    headers: {
      ...headers,
      ...(opts.headers || {}),
    },
  };

  try {
    const res = await fetch(url, config);

    // Handle 401 Unauthorized - token is invalid or expired
     if (res.status === 401) {
      const currentPage = window.location.pathname;
      
      // If on login/register page, it's wrong credentials
      if (currentPage.includes('loginauth.html') || currentPage.includes('registerauth.html')) {
        const data = await res.json();
        const message = data.errors?.[0]?.msg || "Invalid credentials";
        throw new Error(message);
      }
      
      // Otherwise, it's an expired/invalid session
      localStorage.removeItem("token");
      
      if (!currentPage.includes('main.html') && !currentPage.includes('products.html')) {
        showError("Your session has expired. Please log in again.");
        setTimeout(() => {
          window.location.href = 'loginauth.html';
        }, 1500);
      }
      
      throw new Error("Session expired - please log in again");
    }
    if (res.status === 403) {
      showError("You don't have permission to access this resource.");
      throw new Error("Access forbidden");
    }

    if (res.status === 404) {
      const text = await res.text();
      throw new Error(text || "Resource not found");
    }

    // Handle duplicate values
    if (res.status === 409) {
      const data = await res.json();
      const message = data.errors?.[0]?.msg || "This email is already registered";
      throw new Error(message);
    }

    //Handle 400 validation errors
    if (res.status === 400) {
      const data = await res.json();
      const message = data.errors?.[0]?.msg || "Invalid request";
      throw new Error(message);
    }

    //Server Error
    if (res.status === 500) {
      showError("Server error. Please try again later.");
      throw new Error("Server error");
    }

    //other non-OK responses
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    return res.json();

  } catch (error) {
    //network errors (server down, no internet)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showError("Unable to connect to server. Please check your internet connection.");
      throw new Error("Network error - unable to connect to server");
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Authenticated API call - automatically includes JWT token
 */
async function authedApi(path, opts = {}) {
  const token = localStorage.getItem("token");
  if (!token) {
    showError("Please log in to continue");
    throw new Error("Not authenticated");
  }

  const authedHeaders = {
    ...headers,
    ...(opts.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return api(path, { ...opts, headers: authedHeaders });
}

/**
 * Check if user is authenticated by validating token with backend
 */
async function isAuthenticated() {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    //fetch user from database
    await authedApi("/account/me");
    return true;
  } catch (error) {
    //Token invalid - clear it
    localStorage.removeItem("token");
    return false;
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 */
async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    showError("Please log in to access this page");
    
    setTimeout(() => {
      window.location.href = 'loginauth.html';
    }, 1500);
    
    throw new Error("Authentication required");
  }
}

/**
 * Parse JWT token to get user data (without API call)
 */
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

function showError(message) {
  const msgElements = [
    document.getElementById("loginMsg"),
    document.getElementById("regMsg"),
    document.getElementById("form-error")
  ];
  
  const msgEl = msgElements.find(el => el !== null);
  
  if (msgEl) {
    msgEl.className = "error";
    msgEl.textContent = message;
    msgEl.style.display = "block";
  } else {
    alert(message);
  }
}


function showSuccess(message) {
  const msgElements = [
    document.getElementById("loginMsg"),
    document.getElementById("regMsg"),
    document.getElementById("form-success")
  ];
  
  const msgEl = msgElements.find(el => el !== null);
  
  if (msgEl) {
    msgEl.className = "success";
    msgEl.textContent = message;
    msgEl.style.display = "block";
  }
}

const productImages = {
  Refrigerator: "https://zlinekitchen.com/cdn/shop/products/zline--french--door--stainless--steel--standard--depth--refrigerator--RSM-W-36--side.jpg?v=1722276759&width=1946",
  Microwave: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6577/6577280_sd.jpg",
  Dishwasher: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/28f0ed55-0925-4cf5-92a1-cd8e15b2e4c3.jpg",
  Oven: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6401/6401963_sd.jpg",
  Washer: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRHFP8zaZVxIWcSWSVep64sTKkNXpAUwjc1r-JWgSiIzJec9AgcXtD14uslJUbgiucfnOhAmOkk44xkEKsKSMy_WHA9SAY4XXaflYq8lY1uWl7Wiy_1T6ktrIrGudNit0ONXFR5PDuJX9s&usqp=CAc",
  Dryer: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTxzQsvZ5-0y3nx6SmTdPYKqHtnKtUoNMSj27WSABnLIHa0S5rUf3alGypWsHDaEbFhLNdhJOa0uz023MbufcB7e1CImjm-e1jw7hnxunPdJBvaYymoL6uTNEZqUroAiYtVF1jd340dP4I&usqp=CAc",
  Blender: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6395/6395884_sd.jpg",
  DripCoffee: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6553/6553385_sd.jpg",
  Laptop: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/189f8d5b-03fe-4d49-aa2b-552018e1c819.jpg",
  TV: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/0343bc5e-db43-4664-8ef1-8a7255eae875.jpg",
  Speaker: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/db2aafd7-3ca3-48e3-a7fe-36714093bf8c.jpg",
  Vinyl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/a495cade-d7b5-4eb8-a36f-c378d3c29ec9.jpg",
  Switch2: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/2d2b885d-0b91-4a0a-b8e0-247fd2b26ab7.jpg",
  PlayStation5: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6601/6601524_sd.jpg",
  XboxS: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6470/6470289_sd.jpg",
  OutDatedGameBoy: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Game-Boy-FL.png",
  Headphones: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/4c7591bb-84b4-4697-b3a7-91ba2d6c83fa.jpg",
  IPad: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/2a76c272-cd12-43b9-ace9-34df9942ddd6.jpg",
  GamingDesktop: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/08c4770e-4f55-494e-a8ed-6604c87bef73.jpg",
  Printer: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/02d42d73-c9c2-4f3a-a964-6d7d37a9f574.jpg",
  Monitor: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6208cafc-fd04-4b29-89a5-4b431fde8df7.jpg",
  Camera: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6536/6536336_sd.jpg",
  SmartWatch: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/9ac5d1ec-3b32-4adb-a2f5-adc8b3c047e9.jpg",
  Vaccum: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/30d1d685-9631-4dcb-b24a-27211cc47de2.jpg",
  iPhone: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/b9d2c4ba-c369-4076-81d0-28a097d72cc5.jpg",
  Samsung: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6612/6612706_sd.jpg",
  Airpods: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6084/6084400_sd.jpg",
  PhoneCharger: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/0e98d00f-dbc3-492d-b062-45a556dbe73b.jpg",
  LaptopCharger: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6471/6471243_sd.jpg",
  Cookware: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/12eebe8e-cec5-4e95-a67a-1ed7c3650bf7.jpg",
  Toaster: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/9675d7aa-000c-4b78-a8ee-c2413e56c6c4.jpg",
  Cooker: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/8a375c18-b729-4b48-8f5e-bb7f3807dd76.jpg",
  WaffleMaker: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/2e714d11-f602-44d3-b15b-051e84027af9.jpg",
  SmartSpeaker: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6587/6587898_sd.jpg"
};