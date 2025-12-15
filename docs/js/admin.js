let allUsers = [];
let allOrders = [];

function $(id) {
  return document.getElementById(id);
}

function showMsg(text, type = "") {
  const el = $("msg");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden", "error");
  if (type === "error") el.classList.add("error");
}

function hideMsg() {
  const el = $("msg");
  if (!el) return;
  el.classList.add("hidden");
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function fmtDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function userMatches(u, q) {
  if (!q) return true;
  const hay = [
    u.id,
    u.first_name,
    u.last_name,
    u.email,
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

function orderMatches(o, q, statusWanted) {
  const s = String(o.status || "").toLowerCase();
  if (statusWanted && s !== statusWanted) return false;

  if (!q) return true;
  const hay = [
    o.id,
    o.userId,
    o.userEmail,
    o.userName,
    o.shippingEmail,
    o.shippingName,
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

function statusChip(status) {
  const s = String(status || "").toLowerCase();
  return `<span class="status ${s}">${s || "-"}</span>`;
}

function renderUsers() {
  const tbody = $("usersTbody");
  const q = ($("userSearch").value || "").trim().toLowerCase();

  const filtered = allUsers.filter(u => userMatches(u, q));

  tbody.innerHTML = "";
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">No matching users.</td></tr>`;
    return;
  }

  for (const u of filtered) {
    const shipping = [
      u.shipping_street,
      u.shipping_city,
      u.shipping_state,
      u.shipping_country,
      u.shipping_zip,
    ].filter(Boolean).join(", ");

    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${u.id}</td>
        <td>${(u.first_name || "")} ${(u.last_name || "")}</td>
        <td>${u.email || "-"}</td>
        <td>${u.is_admin ? "YES" : "NO"}</td>
        <td>${fmtDate(u.created_at)}</td>
        <td>${shipping || "<span class='muted'>—</span>"}</td>
      </tr>
    `);
  }
}

function renderOrders() {
  const tbody = $("ordersTbody");
  const q = ($("orderSearch").value || "").trim().toLowerCase();
  const statusWanted = ($("statusFilter").value || "").trim().toLowerCase();

  const filtered = allOrders.filter(o => orderMatches(o, q, statusWanted));

  tbody.innerHTML = "";
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">No matching orders.</td></tr>`;
    return;
  }

  for (const o of filtered) {
    const itemsHtml = (o.items || []).map(it => `
      <div class="item-row">
        <div class="item-left">
          <div><b>${it.productName || it.productId}</b></div>
          <div class="muted">qty: ${it.qty}</div>
        </div>
        <div><b>${money(it.price)}</b></div>
      </div>
    `).join("");

    const userLine = `
      <div><b>${o.userName || "—"}</b></div>
      <div class="muted">${o.userEmail || ""}${o.userId ? ` · #${o.userId}` : ""}</div>
    `;

    const shippingLine = `
      <div><b>${o.shippingName || "—"}</b></div>
      <div class="muted">${o.shippingEmail || ""}</div>
    `;

    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td><b>${o.id}</b></td>
        <td>${userLine}</td>
        <td>${money(o.total)}</td>
        <td>${statusChip(o.status)}</td>
        <td>${fmtDate(o.createdAt)}</td>
        <td>${shippingLine}</td>
        <td><div class="items">${itemsHtml || "<span class='muted'>—</span>"}</div></td>
        <td>
          <div class="update-wrap">
            <select data-order="${o.id}">
              <option value="pending" ${o.status==="pending"?"selected":""}>pending</option>
              <option value="paid" ${o.status==="paid"?"selected":""}>paid</option>
              <option value="shipped" ${o.status==="shipped"?"selected":""}>shipped</option>
              <option value="delivered" ${o.status==="delivered"?"selected":""}>delivered</option>
              <option value="failed" ${o.status==="failed"?"selected":""}>failed</option>
              <option value="cancelled" ${o.status==="cancelled"?"selected":""}>cancelled</option>
            </select>
            <button type="button" data-update="${o.id}">Save</button>
          </div>
        </td>
      </tr>
    `);
  }

  tbody.querySelectorAll("button[data-update]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-update");
      const sel = tbody.querySelector(`select[data-order="${orderId}"]`);
      const newStatus = sel ? sel.value : "";
      await updateOrderStatus(orderId, newStatus);
    });
  });
}

async function loadUsers() {
  $("usersTbody").innerHTML = `<tr><td colspan="6" class="muted">Loading users…</td></tr>`;
  allUsers = await authedApi("/admin/users");
  renderUsers();
}

async function loadOrders() {
  $("ordersTbody").innerHTML = `<tr><td colspan="8" class="muted">Loading orders…</td></tr>`;
  allOrders = await authedApi("/admin/orders");
  renderOrders();
}

async function refreshAll() {
  hideMsg();
  await loadUsers();
  await loadOrders();
}

async function updateOrderStatus(orderId, status) {
  hideMsg();
  try {
    await authedApi(`/admin/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) allOrders[idx].status = status;

    renderOrders();
    showMsg(`Order ${orderId} updated to "${status}".`);
  } catch (e) {
    console.error(e);
    showMsg(`Failed to update order: ${e.message}`, "error");
  }
}

async function verifyAdminOrKick() {
  const badge = $("adminBadge");
  try {
    await requireAuth();
    const info = await authedApi("/admin/verify");
    badge.textContent = `Admin: ${info.adminEmail || "verified"}`;
  } catch (e) {
    badge.textContent = "Not authorized";
    alert("Admin access required.");
    window.location.href = "loginauth.html";
    throw e;
  }
}

function setupEvents() {
  $("refreshUsersBtn").addEventListener("click", loadUsers);
  $("refreshOrdersBtn").addEventListener("click", loadOrders);

  $("userSearch").addEventListener("input", renderUsers);
  $("orderSearch").addEventListener("input", renderOrders);
  $("statusFilter").addEventListener("change", renderOrders);

  $("logoutBtn").addEventListener("click", () => {
    if (confirm("Log out?")) {
      localStorage.removeItem("token");
      window.location.href = "loginauth.html";
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupEvents();
  await verifyAdminOrKick();
  await refreshAll();
});
