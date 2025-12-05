// Shows past orders with filters: Last 30 days / Last 6 months / This year / All

let allOrders = [];
let currentFilter = "30"; // default = last 30 days

document.addEventListener("DOMContentLoaded", async () => {
    // If you have auth checking like other pages, use it
    if (typeof checkAuth === "function") {
        if (!checkAuth()) return;
    }

    setupFilterButtons();
    await loadOrders();
    applyFilterAndRender();
});

// Filter buttons
function setupFilterButtons() {
    // In HTML: buttons with class="filter-btn" and data-range="30"|"180"|"year"|"all"
    const buttons = document.querySelectorAll(".filter-btn");

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            // toggle active styling
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            currentFilter = btn.dataset.range; // "30", "180", "year", "all"
            applyFilterAndRender();
        });
    });
}


// Load orders from backend
async function loadOrders() {
    const listEl = document.getElementById("orders-list");

    try {
        // Uses api() helper from api.js
        // Expected endpoint: GET /api/orders
        const data = await api("/orders");

        // Sort newest → oldest
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        allOrders = data;
    } catch (err) {
        console.error("Error loading orders:", err);
        if (listEl) {
            listEl.innerHTML = "<p>Failed to load your orders.</p>";
        }
    }
}

// Apply current filter and re-render
function applyFilterAndRender() {
    const now = new Date();
    let filtered = allOrders.slice();

    if (currentFilter === "30") {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        filtered = filtered.filter(o => new Date(o.createdAt) >= cutoff);
    } else if (currentFilter === "180") {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 180);
        filtered = filtered.filter(o => new Date(o.createdAt) >= cutoff);
    } else if (currentFilter === "year") {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        filtered = filtered.filter(o => new Date(o.createdAt) >= yearStart);
    }
    // "all" = no extra filtering

    renderOrders(filtered);
}

// Rendering helpers
function renderOrders(orders) {
    const listEl = document.getElementById("orders-list");
    const emptyEl = document.getElementById("no-orders");

    if (!listEl) return;

    if (!orders || orders.length === 0) {
        listEl.innerHTML = "";
        if (emptyEl) emptyEl.classList.remove("hidden");
        return;
    }

    if (emptyEl) emptyEl.classList.add("hidden");

    listEl.innerHTML = orders.map(orderToHtml).join("");
}

function orderToHtml(order) {
    const created = new Date(order.createdAt);
    const formattedDate = created.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const items = order.items || [];

    const subtotal = Number(order.subtotal || 0);
    const tax = Number(order.tax || 0);
    const total = Number(
        order.total !== undefined && order.total !== null
            ? order.total
            : subtotal + tax
    );

    const itemsHtml = items.map(itemToHtml).join("");

    return `
        <article class="order-card">
            <div class="order-header">
                <div class="order-header-main">
                    <div class="order-date">${formattedDate}</div>
                    <div class="order-header-subtext">
                        ${items.length} item${items.length === 1 ? "" : "s"}
                    </div>
                </div>
                <div class="order-total">Total: $${total.toFixed(2)}</div>
            </div>

            <div class="order-items">
                ${itemsHtml}
            </div>

            <div class="order-summary-row">
                <div class="order-summary-line">
                    <span>Subtotal:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="order-summary-line">
                    <span>Tax:</span>
                    <span>$${tax.toFixed(2)}</span>
                </div>
                <div class="order-summary-line order-summary-total">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
        </article>
    `;
}

function itemToHtml(item) {
    // Try different fields the backend might send
    const name =
        item.name ||
        item.productName ||
        item.title ||
        "Item";

    // Map item name → productImages key
    // You can also send item.imageKey from backend if you want it exact
    let imageKey = item.imageKey;

    if (!imageKey && name) {
        // Remove spaces to match your keys like "DripCoffee"
        imageKey = name.replace(/\s+/g, "");
    }

    const imgSrc =
        (imageKey && productImages[imageKey]) ||
        productImages[name] ||
        "../images/placeholder.png";

    const unitPrice = Number(
        item.unitPrice !== undefined
            ? item.unitPrice
            : item.price !== undefined
            ? item.price
            : 0
    );
    const qty = Number(item.quantity !== undefined ? item.quantity : item.qty || 1);
    const lineTotal = unitPrice * qty;

    return `
        <div class="order-item-row">
            <img src="${imgSrc}" alt="${name}" class="order-item-img" />
            <div class="order-item-info">
                <div class="order-item-name">${name}</div>
                <div class="order-item-meta">
                    $${unitPrice.toFixed(2)} each • Qty ${qty}
                </div>
            </div>
            <div class="order-item-subtotal">$${lineTotal.toFixed(2)}</div>
        </div>
    `;
}
