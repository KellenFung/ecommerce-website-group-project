/**
 * products.js
 * Checks authentication before adding to cart
 */

// State for product detail modal
let currentProductId = null;

function setupProductCards() {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const name = card.dataset.name;
      const price = card.dataset.price;
      const img = card.querySelector("img").src;
      openProductModal({ id, name, price, img });
    });
  });
}

function openProductModal(product) {
  currentProductId = product.id;

  const nameEl = document.getElementById("modalProductName");
  const priceEl = document.getElementById("modalProductPrice");
  const imgEl = document.getElementById("modalProductImage");
  const qtyEl = document.getElementById("productQty");

  if (nameEl) nameEl.textContent = product.name;
  if (priceEl) priceEl.textContent = "$" + product.price;
  if (imgEl) {
    imgEl.src =
      product.img || productImages[product.id] || "https://via.placeholder.com/220?text=Item";
  }
  if (qtyEl) qtyEl.value = 1;

  const modal = document.getElementById("productModal");
  if (modal) modal.style.display = "block";
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (modal) modal.style.display = "none";
}

async function addCurrentProductToCart() {
  const qtyEl = document.getElementById("productQty");
  const qty = parseInt(qtyEl?.value || "1", 10) || 1;
  if (!currentProductId) return;
  await myItem(currentProductId, qty);
  closeProductModal();
}

async function myItem(itemName, qty = 1) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to add items to your cart.");
      window.location.href = "loginauth.html";
      return;
    }

    await authedApi("/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId: itemName, qty: qty })
    });
    
    alert(itemName + " added to cart");
    
    // Update cart badge
    if (typeof updateCartBadge === 'function') {
      await updateCartBadge();
    }
  } catch (e) {
    console.error("Failed to add item:", e);
    alert("Add failed: " + e.message);
  }
}

// Global click handler for closing modals when clicking outside
window.addEventListener("click", function(event) {
  const cartModal = document.getElementById("cartModal");
  const productModal = document.getElementById("productModal");

  if (event.target === cartModal) {
    closeCart();
  }
  if (event.target === productModal) {
    closeProductModal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setupProductCards();
});