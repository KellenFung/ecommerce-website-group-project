import re
import uuid
import datetime
import os

from flask import Flask, request, jsonify, abort
from flask_cors import CORS

import jwt
from mysql.connector import pooling, Error as MySQLError
from email_validator import validate_email, EmailNotValidError

from paymentsystem import register_payment_routes

app = Flask(__name__)
CORS(app)

JWT_SECRET = "dev_secret"
PAYMENT_ENCRYPTION_KEY = os.environ.get('PAYMENT_KEY', 'dev_payment_key_change_in_production')

DB_CONFIG = {
    "host": "localhost",
    "user": "ebuy_user",
    "password": "Software5432",
    "database": "ebuy_app",
}

pool = pooling.MySQLConnectionPool(
    pool_name="ebuy_pool",
    pool_size=5,
    **DB_CONFIG,
)

NAME_RE = re.compile(r"^.{2,}$")


def issue_token(user):
    payload = {
        "id": user["id"], 
        "email": user["email"], 
        "first_name": user["first_name"], 
        "last_name": user["last_name"],
        "address": user.get("address"),}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


# ---------- AUTH ROUTES ----------

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    address = (data.get("address") or "").strip() or None

    try:
        validate_email(email)
    except EmailNotValidError:
        return jsonify({"errors": [{"msg": "Invalid email"}]}), 400

    if not NAME_RE.match(first_name):
        return jsonify({"errors": [{"msg": "First name must be at least 2 characters"}]}), 400

    if not NAME_RE.match(last_name):
        return jsonify({"errors": [{"msg": "Last name must be at least 2 characters"}]}), 400

    if len(password) < 8:
        return jsonify({"errors": [{"msg": "Password must be at least 8 characters"}]}), 400

    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "INSERT INTO users (first_name, last_name, email, password_hash, address) "
            "VALUES (%s ,%s, %s, SHA2(%s,256), %s)",
            (first_name, last_name, email, password, address),
        )
        conn.commit()
        return jsonify({"id": cur.lastrowid, "email": email})
    except MySQLError as e:
        if getattr(e, "errno", None) == 1062:
            return "Email already registered", 409
        app.logger.exception(e)
        return "Server error", 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    try:
        validate_email(email)
    except EmailNotValidError:
        return jsonify({"errors": [{"msg": "Invalid email"}]}), 400

    if len(password) < 8:
        return jsonify({"errors": [{"msg": "Password must be at least 8 characters"}]}), 400

    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id,  first_name, last_name, email, address  "
            "FROM users "
            "WHERE email=%s AND password_hash=SHA2(%s,256) "
            "LIMIT 1",
            (email, password),
        )
        row = cur.fetchone()
        if not row:
            return "Invalid credentials", 401

        token = issue_token(row)
        return jsonify({"token": token, "user": row})
    except MySQLError as e:
        app.logger.exception(e)
        return "Server error", 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


# ---------- PRODUCTS / CART / ORDERS ----------

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
    "OutDatedGameBoy": {"price": 59},
    "Headphones": {"price": 49},
    "IPad": {"price": 299},
    "GamingDesktop": {"price": 999},
    "Printer": {"price": 230},
    "Monitor": {"price": 750},
    "Camera": {"price": 700},
    "SmartWatch": {"price": 299},
    "Vaccum": {"price": 100},
}

# still using in-memory carts and an in-memory mirror of orders
CARTS = {}
ORDERS = {}


def tok():
    return request.headers.get("X-Demo-Token") or "guest"


def subtotal(t):
    cart = CARTS.get(t, {})
    return sum(PRODUCTS[p]["price"] * q for p, q in cart.items())


@app.get("/api/products")
def list_products():
    return jsonify([{"id": k, "price": v["price"]} for k, v in PRODUCTS.items()])


@app.get("/api/cart")
def get_cart():
    t = tok()
    items = [
        {"productId": p, "qty": q, "price": PRODUCTS[p]["price"]}
        for p, q in CARTS.get(t, {}).items()
    ]
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


@app.post("/api/orders")
def create_order():
    t = tok()
    
    # Try to get user_id from JWT token
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload['id']
        except jwt.InvalidTokenError:
            pass
    
    if not CARTS.get(t):
        abort(400, "cart empty")

    # snapshot the cart so we can clear it safely later
    cart_items = CARTS[t].copy()
    order_total = sum(PRODUCTS[p]["price"] * q for p, q in cart_items.items())
    order_id = uuid.uuid4().hex[:12]
    created_at = datetime.datetime.utcnow()

    try:
        conn = pool.get_connection()
        cur = conn.cursor()

        # insert order row WITH user_id
        cur.execute(
            """
            INSERT INTO orders (id, demo_token, user_id, total, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (order_id, t, user_id, order_total, "pending", created_at),
        )

        # insert order_items rows
        for p, q in cart_items.items():
            price = PRODUCTS[p]["price"]
            line_total = price * q
            cur.execute(
                """
                INSERT INTO order_items
                  (order_id, product_id, quantity, unit_price, line_total)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (order_id, p, q, price, line_total),
            )

        conn.commit()
    except MySQLError as e:
        app.logger.exception(e)
        return "Server error", 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    # build response object exactly like before
    order_obj = {
        "id": order_id,
        "user": t,
        "items": [
            {"productId": p, "qty": q, "price": PRODUCTS[p]["price"]}
            for p, q in cart_items.items()
        ],
        "total": order_total,
        "status": "pending",
        "createdAt": created_at.isoformat(),
    }

    ORDERS[order_id] = order_obj
    CARTS[t] = {}

    return jsonify(order_obj)


@app.get("/api/orders")
def list_orders():
    # Check for JWT token first (for logged-in users)
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload['id']
            
            # Get orders from database for this user
            try:
                conn = pool.get_connection()
                cur = conn.cursor(dictionary=True)
                
                # Get orders
                cur.execute("""
                    SELECT id, total, status, created_at, paid_at
                    FROM orders
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                """, (user_id,))
                
                orders = cur.fetchall()
                
                # Get items for each order
                result = []
                for order in orders:
                    cur.execute("""
                        SELECT product_id, quantity, unit_price
                        FROM order_items
                        WHERE order_id = %s
                    """, (order['id'],))
                    
                    items = cur.fetchall()
                    
                    result.append({
                        'id': order['id'],
                        'total': float(order['total']),
                        'status': order['status'],
                        'createdAt': order['created_at'].isoformat() if order['created_at'] else None,
                        'items': [{
                            'productId': item['product_id'],
                            'qty': item['quantity'],
                            'price': float(item['unit_price'])
                        } for item in items]
                    })
                
                cur.close()
                conn.close()
                
                return jsonify(result)
                
            except MySQLError as e:
                app.logger.exception(e)
                return "Server error", 500
                
        except jwt.InvalidTokenError:
            pass
    
    # Fallback to demo token behavior (for guest users)
    t = tok()
    return jsonify([o for o in ORDERS.values() if o["user"] == t])


@app.post("/api/payments/mock")
def pay():
    data = request.get_json(force=True)
    oid = data.get("orderId")
    outcome = data.get("outcome", "success")

    if oid not in ORDERS:
        abort(404, "order not found")

    new_status = "paid" if outcome == "success" else "failed"
    ORDERS[oid]["status"] = new_status

    # also update DB so status persists
    try:
        conn = pool.get_connection()
        cur = conn.cursor()
        if new_status == "paid":
            cur.execute(
                "UPDATE orders SET status=%s, paid_at=%s WHERE id=%s",
                (new_status, datetime.datetime.utcnow(), oid),
            )
        else:
            cur.execute(
                "UPDATE orders SET status=%s WHERE id=%s",
                (new_status, oid),
            )
        conn.commit()
    except MySQLError as e:
        app.logger.exception(e)
        # still return the in-memory order so front-end behavior stays same
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    return jsonify(ORDERS[oid])


# ---------- REGISTER PAYMENT ROUTES ----------
register_payment_routes(app, pool, JWT_SECRET, PAYMENT_ENCRYPTION_KEY)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)