/**
 * cart.js - FIXED VERSION
 * Uses authedApi() for authentication
 * Uses cart_item_id (item.id) for PATCH/DELETE operations
 */

// Update cart badge in header
async function updateCartBadge() {
  try {
    const cart = await authedApi("/cart");
    const itemCount = cart.items.length;
    const badge = document.getElementById("cartBadge");

    if (!badge) return;

    if (itemCount > 0) {
      badge.textContent = itemCount;
      badge.classList.add("show");
    } else {
      badge.classList.remove("show");
    }
  } catch (e) {
    console.error("Badge update failed:", e);
  }
}

async function loadCart() {
  const container = document.getElementById("cartProducts");
  if (!container) return;

  container.innerHTML = '<div class="empty-message">Loading cart...</div>';

  try {
    const cart = await authedApi("/cart");

    if (!cart.items.length) {
      container.innerHTML = '<div class="empty-message">Your cart is empty.</div>';
      updateSummary(0);
      return;
    }

    container.innerHTML = "";
    cart.items.forEach(item => {
      container.appendChild(createProductRow(item));
    });

    updateSummary(cart.subtotal);
  } catch (e) {
    console.error("Error loading cart:", e);
    container.innerHTML = '<div class="empty-message">Error loading cart.</div>';
  }
}

function createProductRow(item) {
  const cartItemId = item.id; 
  const productId = item.productId;
  const price = item.price;
  const qty = item.qty;

  const row = document.createElement("div");
  row.className = "cart-product-row";
  row.dataset.cartItemId = cartItemId; 
  row.dataset.productId = productId;

  const imgDiv = document.createElement("div");
  imgDiv.className = "product_image";
  const img = document.createElement("img");
  img.alt = productId;
  img.src = productImages[productId] || "https://via.placeholder.com/80x80?text=Item";
  imgDiv.appendChild(img);

  const descDiv = document.createElement("div");
  descDiv.className = "product_description";

  const title = document.createElement("h3");
  title.textContent = item.productName || productId;

  const priceDiv = document.createElement("div");
  priceDiv.className = "product_price";
  priceDiv.textContent = `$${price} each`;

  const countContainer = document.createElement("div");
  countContainer.className = "count-container";

  const minus = document.createElement("div");
  minus.className = "subtract-counter";
  minus.textContent = "-";

  const counter = document.createElement("div");
  counter.className = "counter";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "quantity-input";
  input.value = qty;

  counter.appendChild(input);

  const plus = document.createElement("div");
  plus.className = "add-counter";
  plus.textContent = "+";

  countContainer.appendChild(minus);
  countContainer.appendChild(counter);
  countContainer.appendChild(plus);

  descDiv.appendChild(title);
  descDiv.appendChild(priceDiv);
  descDiv.appendChild(countContainer);

  const delBtn = document.createElement("button");
  delBtn.className = "delete-product";
  delBtn.innerHTML = "&times;";

  row.appendChild(imgDiv);
  row.appendChild(descDiv);
  row.appendChild(delBtn);

  minus.addEventListener("click", () =>
    changeQty(cartItemId, parseInt(input.value || "1", 10) - 1)
  );
  plus.addEventListener("click", () =>
    changeQty(cartItemId, parseInt(input.value || "1", 10) + 1)
  );
  delBtn.addEventListener("click", () => removeItem(cartItemId));

  return row;
}

async function changeQty(cartItemId, newQty) {
  if (newQty <= 0) {
    if (confirm("Remove this item from cart?")) {
      await removeItem(cartItemId);
    }
    return;
  }
  try {
    await authedApi(`/cart/items/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ qty: newQty })
    });
    await loadCart();
    await updateCartBadge();
  } catch (e) {
    console.error("Failed to update quantity:", e);
    alert("Failed to update quantity");
  }
}

async function removeItem(cartItemId) {
  try {
    await authedApi(`/cart/items/${cartItemId}`, {
      method: "DELETE"
    });
    await loadCart();
    await updateCartBadge();
  } catch (e) {
    console.error("Failed to remove item:", e);
    alert("Failed to remove item");
  }
}

function updateSummary(subtotal) {
  const shipping = subtotal > 0 ? 0 : 0;
  const taxRate = 0.08;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + shipping + tax;

  const subEl = document.getElementById("order-subtotal");
  const shipEl = document.getElementById("order-shipping");
  const taxEl = document.getElementById("order-tax");
  const totalEl = document.getElementById("order-total");

  if (subEl) subEl.textContent = `Subtotal: $${subtotal.toFixed(2)}`;
  if (shipEl) shipEl.textContent = `Shipping: $${shipping.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `Tax: $${tax.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `Total: $${total.toFixed(2)}`;
}

async function openCart() {
  const modal = document.getElementById("cartModal");
  if (!modal) return;
  modal.style.display = "block";
  await loadCart();
}

function closeCart() {
  const modal = document.getElementById("cartModal");
  if (modal) modal.style.display = "none";
}

async function checkout() {
  closeCart();
  window.location.href = "checkout.html";
}