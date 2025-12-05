document.addEventListener("DOMContentLoaded", () => {
  const streetInput   = document.getElementById("street-input");
  const cityInput     = document.getElementById("city-input");
  const stateSelect   = document.getElementById("state-select");
  const provinceInput = document.getElementById("province-input");
  const countryInput  = document.getElementById("country-input");
  const zipInput      = document.getElementById("zip-input");

  const provinceBox = document.getElementById("province-box");
  const countryBox  = document.getElementById("country-box");

  const STORAGE_KEY = "ebuy_address";

  // --- helpers ---

  function toggleNonUsFields() {
    const isNonUs = stateSelect.value === "NON_US";
    provinceBox.style.display = isNonUs ? "flex" : "none";
    countryBox.style.display  = isNonUs ? "flex" : "none";
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);

      if (data.street)   streetInput.value   = data.street;
      if (data.city)     cityInput.value     = data.city;
      if (data.state)    stateSelect.value   = data.state;
      if (data.province) provinceInput.value = data.province;
      if (data.country)  countryInput.value  = data.country;
      if (data.zip)      zipInput.value      = data.zip;
    } catch (e) {
      console.error("Failed to load address from storage", e);
    }
  }

  function saveToStorage() {
    const payload = {
      street:   streetInput.value.trim(),
      city:     cityInput.value.trim(),
      state:    stateSelect.value,
      province: provinceInput.value.trim(),
      country:  countryInput.value.trim(),
      zip:      zipInput.value.trim()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      alert("Address saved (demo only — this would go to SQL later).");
    } catch (e) {
      console.error("Failed to save address", e);
      alert("Could not save address.");
    }
  }

  // --- wire up events ---

  stateSelect.addEventListener("change", () => {
    toggleNonUsFields();
  });

  // Every "Save Change" just saves the whole address object
  document.querySelectorAll(".save-changes").forEach(btn => {
    btn.addEventListener("click", (evt) => {
      evt.preventDefault();
      saveToStorage();
    });
  });

  // initial setup
  loadFromStorage();
  toggleNonUsFields();
});
