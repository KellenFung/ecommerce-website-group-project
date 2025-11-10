from flask import Flask, request, jsonify, abort
from flask_cors import CORS
import uuid, datetime

app = Flask(__name__)
CORS(app)

# catalog 
PRODUCTS = {
    "Refrigerator": {"price": 500},
    "Microwave": {"price": 300},
    "Dishwasher": {"price": 450},
    "Oven": {"price": 550},
    "Washer": {"price": 600},
    "Dryer": {"price": 600},
    "Blender": {"price": 100},
    "DripCoffee": {"price": 150},
    "Laptop": {"price": 200},
    "TV": {"price": 399},
    "Speaker": {"price": 199},
    "OutDatedVinyl": {"price": 50},
    "Switch2": {"price": 499},
    "PlayStation5": {"price": 599},
    "XboxS": {"price": 399},
    "OutDatedGameBoy": {"price": 1},
    "Headphones": {"price": 49},
    "IPad": {"price": 299},
    "GamingDesktop": {"price": 999},
    "Printer": {"price": 230},
    "Monitor": {"price": 750},
    "Camera": {"price": 700},
    "SmartWatch": {"price": 299},
    "Vaccum": {"price": 100},  
}

CARTS = {}   # cart
ORDERS = {}  

def tok():
    return request.headers.get("X-Demo-Token") or "guest"

def subtotal(t):
    cart = CARTS.get(t, {})
    return sum(PRODUCTS[p]["price"] * q for p, q in cart.items())

# products
@app.get("/api/products")
def list_products():
    return jsonify([{"id": k, "price": v["price"]} for k, v in PRODUCTS.items()])

# cart
@app.get("/api/cart")
def get_cart():
    t = tok()
    items = [{"productId": p, "qty": q, "price": PRODUCTS[p]["price"]}
             for p, q in CARTS.get(t, {}).items()]
    return jsonify({"items": items, "subtotal": subtotal(t)})

@app.post("/api/cart/items")
def add_item():
    data = request.get_json(force=True)
    pid = data.get("productId")
    qty = int(data.get("qty", 1))
    if pid not in PRODUCTS:
        abort(400, "invalid product")
    t = tok()
    CARTS.setdefault(t, {})
    CARTS[t][pid] = CARTS[t].get(pid, 0) + max(1, qty)
    return jsonify({"ok": True})

@app.patch("/api/cart/items/<pid>")
def update_item(pid):
    data = request.get_json(force=True)
    qty = int(data.get("qty", 1))
    t = tok()
    if t not in CARTS or pid not in CARTS[t]:
        abort(404, "not in cart")
    CARTS[t][pid] = max(1, qty)
    return jsonify({"ok": True})

@app.delete("/api/cart/items/<pid>")
def remove_item(pid):
    t = tok()
    if t in CARTS and pid in CARTS[t]:
        del CARTS[t][pid]
    return jsonify({"ok": True})

# orders 
@app.post("/api/orders")
def create_order():
    t = tok()
    if not CARTS.get(t):
        abort(400, "cart empty")
    order_id = uuid.uuid4().hex[:12]
    order = {
        "id": order_id,
        "user": t,
        "items": [{"productId": p, "qty": q, "price": PRODUCTS[p]["price"]}
                  for p, q in CARTS[t].items()],
        "total": subtotal(t),
        "status": "pending",
        "createdAt": datetime.datetime.utcnow().isoformat(),
    }
    ORDERS[order_id] = order
    CARTS[t] = {}
    return jsonify(order)

@app.get("/api/orders")
def list_orders():
    t = tok()
    return jsonify([o for o in ORDERS.values() if o["user"] == t])

@app.post("/api/payments/mock")
def pay():
    data = request.get_json(force=True)
    oid = data.get("orderId")
    outcome = data.get("outcome", "success")
    if oid not in ORDERS:
        abort(404, "order not found")
    ORDERS[oid]["status"] = "paid" if outcome == "success" else "failed"
    return jsonify(ORDERS[oid])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
