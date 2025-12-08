let allOrders = [];
let currentFilter = "30";

document.addEventListener("DOMContentLoaded", async () => {
    //REQUIRE AUTHENTICATION
    try {
        await requireAuth();
    } catch (error) {
        return;
    }

    setupFilterButtons();
    await loadOrders();
    applyFilterAndRender();
});

// Filter buttons
function setupFilterButtons() {
    const buttons = document.querySelectorAll(".filter-btn");

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            currentFilter = btn.dataset.range;
            applyFilterAndRender();
        });
    });
}

// Load orders from backend
async function loadOrders() {
    const listEl = document.getElementById("orders-list");

    try {
        const data = await authedApi("/orders");

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

    renderOrders(filtered);
}

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
    
    const total = subtotal + tax;

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
    const name = item.name || item.productName || item.title || "Item";

    let imageKey = item.imageKey || item.productId;
    
    // Try to match product name to image key
    if (!imageKey && name) {
        imageKey = name.replace(/\s+/g, "");
    }

    let imgSrc = "https://via.placeholder.com/100?text=Item";
    
    if (imageKey && productImages[imageKey]) {
        imgSrc = productImages[imageKey];
    } else if (productImages[name]) {
        imgSrc = productImages[name];
    } else if (item.productId && productImages[item.productId]) {
        imgSrc = productImages[item.productId];
    }

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