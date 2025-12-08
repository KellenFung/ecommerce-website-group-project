let editingPaymentId = null;

// Clear all errors
function clearErrors() {
    const errorIds = [
        "cardTypeError",
        "cardholderError",
        "cardNumberError",
        "expiryError",
        "cvvError",
        "zipError",
    ];
    errorIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
    });

    document.querySelectorAll(".error").forEach((el) => el.classList.remove("error"));
}

// Show field error
function showFieldError(fieldId, errorId, message) {
    const errorElement = document.getElementById(errorId);
    const fieldElement = document.getElementById(fieldId);

    if (errorElement) errorElement.textContent = message;
    if (fieldElement) fieldElement.classList.add("error");
}

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
    //REQUIRE AUTHENTICATION
    try {
        await requireAuth();
    } catch (error) {
        return;
    }

    // Prefill cardholder name from JWT
    const token = localStorage.getItem("token");
    const user = parseJwt(token);
    if (user) {
        const holderInput = document.getElementById("cardholderName");
        if (holderInput && !holderInput.value) {
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
            if (fullName) {
                holderInput.value = fullName;
            }
        }
    }

    await loadPaymentMethods();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById("payment-form");
    if (!form) return;

    form.setAttribute("novalidate", "novalidate");

    const cardNumberInput = document.getElementById("cardNumber");
    const expiryDateInput = document.getElementById("expiryDate");
    const cvvInput = document.getElementById("cvv");
    const cancelBtn = document.getElementById("cancel-btn");

    form.addEventListener("submit", handleFormSubmit);

    // Format card number
    if (cardNumberInput) {
        cardNumberInput.addEventListener("input", (e) => {
            let value = e.target.value.replace(/\s/g, "").replace(/\D/g, "");
            e.target.value = value.match(/.{1,4}/g)?.join(" ") || value;

            if (value) {
                document.getElementById("cardNumberError").textContent = "";
                e.target.classList.remove("error");
            }
        });
    }

    // Format expiry MM/YY
    if (expiryDateInput) {
        expiryDateInput.addEventListener("input", (e) => {
            let value = e.target.value.replace(/\D/g, "");
            if (value.length >= 2) {
                value = value.substring(0, 2) + "/" + value.substring(2, 4);
            }
            e.target.value = value;

            if (value) {
                document.getElementById("expiryError").textContent = "";
                e.target.classList.remove("error");
            }
        });
    }

    // CVV only numbers
    if (cvvInput) {
        cvvInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");

            if (e.target.value) {
                document.getElementById("cvvError").textContent = "";
                e.target.classList.remove("error");
            }
        });
    }

    // Cancel button
    if (cancelBtn) cancelBtn.addEventListener("click", resetForm);

    // Other inputs clearing
    document.getElementById("cardType")?.addEventListener("change", function () {
        if (this.value) {
            document.getElementById("cardTypeError").textContent = "";
            this.classList.remove("error");
        }
    });

    document.getElementById("cardholderName")?.addEventListener("input", function () {
        if (this.value) {
            document.getElementById("cardholderError").textContent = "";
            this.classList.remove("error");
        }
    });

    document.getElementById("billingZip")?.addEventListener("input", function () {
        if (this.value) {
            document.getElementById("zipError").textContent = "";
            this.classList.remove("error");
        }
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    clearErrors();

    const formData = {
        cardType: document.getElementById("cardType").value,
        cardholderName: document.getElementById("cardholderName").value.trim(),
        cardNumber: document.getElementById("cardNumber").value.replace(/\s/g, ""),
        expiryDate: document.getElementById("expiryDate").value,
        cvv: document.getElementById("cvv").value,
        billingZip: document.getElementById("billingZip").value.trim(),
        isDefault: document.getElementById("isDefault").checked,
    };

    let hasError = false;

    // Validation
    if (!formData.cardType) {
        showFieldError("cardType", "cardTypeError", "Please fill out this field.");
        hasError = true;
    }

    if (!formData.cardholderName) {
        showFieldError("cardholderName", "cardholderError", "Please fill out this field.");
        hasError = true;
    }

    if (!formData.cardNumber) {
        showFieldError("cardNumber", "cardNumberError", "Please fill out this field.");
        hasError = true;
    } else if (formData.cardNumber.length < 13 || formData.cardNumber.length > 19) {
        showFieldError("cardNumber", "cardNumberError", "Please enter a valid card number.");
        hasError = true;
    }

    // Expiry validation
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;

    if (!formData.expiryDate) {
        showFieldError("expiryDate", "expiryError", "Please fill out this field.");
        hasError = true;
    } else if (!expiryRegex.test(formData.expiryDate)) {
        showFieldError("expiryDate", "expiryError", "Incorrect format");
        hasError = true;
    } else {
        const [mm, yy] = formData.expiryDate.split("/");
        const expiry = new Date(2000 + parseInt(yy), parseInt(mm) - 1, 1);
        const minDate = new Date(2025, 11, 1);
        if (expiry < minDate) {
            showFieldError("expiryDate", "expiryError", "Invalid date");
            hasError = true;
        }
    }

    if (!formData.cvv) {
        showFieldError("cvv", "cvvError", "Please fill out this field.");
        hasError = true;
    } else if (formData.cvv.length < 3 || formData.cvv.length > 4) {
        showFieldError("cvv", "cvvError", "Please enter a valid CVV.");
        hasError = true;
    }

    if (!formData.billingZip) {
        showFieldError("billingZip", "zipError", "Please fill out this field.");
        hasError = true;
    } else if (formData.billingZip.length < 5) {
        showFieldError("billingZip", "zipError", "Invalid ZIP code.");
        hasError = true;
    }

    if (hasError) return;

    try {
        if (editingPaymentId) {
            await authedApi(`/payment-methods/${editingPaymentId}`, {
                method: "PUT",
                body: JSON.stringify(formData),
            });
            alert("Payment updated!");
        } else {
            await authedApi("/payment-methods", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            alert("Payment added!");
        }
        resetForm();
        await loadPaymentMethods();
    } catch (err) {
        console.error("Save error:", err);
        alert("An error occurred: " + err.message);
    }
}

// Load payment methods
async function loadPaymentMethods() {
    const container = document.getElementById("methods-list");

    try {
        const methods = await authedApi("/payment-methods");
        displayPaymentMethods(methods);
    } catch (err) {
        console.error("Error loading:", err);
        container.innerHTML = "<p class='no-payments'>Error loading methods.</p>";
    }
}

// Render payment list
function displayPaymentMethods(methods) {
    const container = document.getElementById("methods-list");

    if (!methods || methods.length === 0) {
        container.innerHTML = "<p class='no-payments'>No saved payment methods.</p>";
        return;
    }

    container.innerHTML = methods
        .map(
            (m) => `
        <div class="payment-card ${m.isDefault ? "default" : ""}">
            <div class="payment-info">
                <div class="card-type-display">${m.cardType}</div>
                <div class="card-number-display">
                    •••• •••• •••• ${m.lastFourDigits}
                    ${m.isDefault ? '<span class="default-badge">DEFAULT</span>' : ""}
                </div>
                <div class="card-details">
                    ${m.cardholderName} | Expires: ${m.expiryDate} | ZIP: ${m.billingZip}
                </div>
            </div>

            <div class="payment-actions">
                <button class="small-btn primary" onclick="editPaymentMethod(${m.id})">Edit</button>
                <button class="small-btn danger" onclick="deletePaymentMethod(${m.id})">Delete</button>
            </div>
        </div>
        `
        )
        .join("");
}

// Edit payment method
async function editPaymentMethod(id) {
    try {
        const method = await authedApi(`/payment-methods/${id}`);

        document.getElementById("payment-id").value = id;
        document.getElementById("cardType").value = method.cardType;
        document.getElementById("cardholderName").value = method.cardholderName;
        document.getElementById("cardNumber").value = method.cardNumber;
        document.getElementById("expiryDate").value = method.expiryDate;
        document.getElementById("cvv").value = "";
        document.getElementById("billingZip").value = method.billingZip;
        document.getElementById("isDefault").checked = method.isDefault;

        document.getElementById("form-title").textContent = "Edit Payment Method";
        document.getElementById("submit-btn").textContent = "Update Payment Method";
        document.getElementById("cancel-btn").style.display = "block";

        editingPaymentId = id;

        document.getElementById("payment-form-card").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
        console.error("Edit error:", err);
        alert("Failed to load card.");
    }
}

// Delete method
async function deletePaymentMethod(id) {
    if (!confirm("Delete this payment method?")) return;

    try {
        await authedApi(`/payment-methods/${id}`, {
            method: "DELETE",
        });
        alert("Deleted.");
        await loadPaymentMethods();
    } catch (err) {
        console.error("Delete error:", err);
        alert("An error occurred.");
    }
}

// Reset form
function resetForm() {
    const form = document.getElementById("payment-form");
    if (form) form.reset();

    document.getElementById("payment-id").value = "";
    document.getElementById("form-title").textContent = "Add a New Card";
    document.getElementById("submit-btn").textContent = "Save Payment Method";
    document.getElementById("cancel-btn").style.display = "none";

    editingPaymentId = null;
    clearErrors();
}