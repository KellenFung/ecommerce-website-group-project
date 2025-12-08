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
    """
    Generate JWT token for authenticated user.
    
    Args:
        user (dict): User data from database
        
    Returns:
        str: Encoded JWT token
    """
    payload = {
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "address": user.get("address"),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def get_user_id_from_token():
    """
    Extract and validate user ID from JWT token.
    
    Returns:
        int: User ID from token
        
    Raises:
        401: If token is missing, invalid, or expired
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        abort(401, "Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        abort(401, "Invalid token")

    return payload.get("id")


@app.get("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({"ok": True})


# ---------- AUTH ROUTES ----------

@app.post("/api/auth/register")
def register():
    """
    Register a new user account.
    
    Required fields: first_name, last_name, email, password
    Optional fields: address
    
    Returns:
        201: User created successfully
        400: Validation error
        409: Email already exists
        500: Server error
    """
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
            """
            INSERT INTO users (first_name, last_name, email, password_hash, address)
            VALUES (%s, %s, %s, SHA2(%s,256), %s)
            """,
            (first_name, last_name, email, password, address),
        )
        conn.commit()
        return jsonify({"id": cur.lastrowid, "email": email}), 201
    except MySQLError as e:
        if getattr(e, "errno", None) == 1062:
            return jsonify({"errors": [{"msg": "Email already registered"}]}), 409
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/auth/login")
def login():
    """
    Authenticate user and return JWT token.
    
    Required fields: email, password
    
    Returns:
        200: Login successful with token
        400: Validation error
        401: Invalid credentials
        500: Server error
    """
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
            """
            SELECT id, first_name, last_name, email, address,
                   shipping_street, shipping_city, shipping_state,
                   shipping_country,
                   shipping_zip, shipping_phone
            FROM users
            WHERE email=%s AND password_hash=SHA2(%s,256)
            LIMIT 1
            """,
            (email, password),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"errors": [{"msg": "Invalid credentials"}]}), 401

        token = issue_token(row)
        return jsonify({"token": token, "user": row})
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


# ---------- ACCOUNT ROUTES (PROFILE / ADDRESS / LOGIN INFO) ----------

@app.get("/api/account/me")
def get_account():
    """
    Get current user's account information.
    Requires authentication.
    
    Returns:
        200: User profile data
        401: Not authenticated
        404: User not found
        500: Server error
    """
    user_id = get_user_id_from_token()

    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT id, first_name, last_name, email, address,
                   shipping_street, shipping_city, shipping_state,
                   shipping_country,
                   shipping_zip, shipping_phone
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            abort(404, "User not found")

        return jsonify(row)
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.put("/api/account/me")
def update_account():
    """
    Update current user's account information.
    Requires authentication.
    
    Accepted fields: first_name, last_name, email, password,
                     address, shipping_street, shipping_city, 
                     shipping_state, shipping_country,
                     shipping_zip, shipping_phone
    
    Returns:
        200: Update successful
        400: Validation error
        401: Not authenticated
        409: Email already taken
        500: Server error
    """
    user_id = get_user_id_from_token()
    data = request.get_json(silent=True) or {}

    updates = []
    params = []

    # First name
    if "first_name" in data:
        first_name = (data.get("first_name") or "").strip()
        if not NAME_RE.match(first_name):
            return jsonify({"errors": [{"msg": "First name must be at least 2 characters"}]}), 400
        updates.append("first_name = %s")
        params.append(first_name)

    # Last name
    if "last_name" in data:
        last_name = (data.get("last_name") or "").strip()
        if not NAME_RE.match(last_name):
            return jsonify({"errors": [{"msg": "Last name must be at least 2 characters"}]}), 400
        updates.append("last_name = %s")
        params.append(last_name)

    # Email
    if "email" in data:
        email = (data.get("email") or "").strip().lower()
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({"errors": [{"msg": "Invalid email"}]}), 400
        updates.append("email = %s")
        params.append(email)

    # Plain address (optional text)
    if "address" in data:
        addr = (data.get("address") or "").strip() or None
        updates.append("address = %s")
        params.append(addr)

    # Shipping fields (used by address-edit and checkout)
    if "shipping_street" in data:
        updates.append("shipping_street = %s")
        params.append((data.get("shipping_street") or "").strip())

    if "shipping_city" in data:
        updates.append("shipping_city = %s")
        params.append((data.get("shipping_city") or "").strip())

    if "shipping_state" in data:
        updates.append("shipping_state = %s")
        params.append((data.get("shipping_state") or "").strip())


    # Country field
    if "shipping_country" in data:
        updates.append("shipping_country = %s")
        params.append((data.get("shipping_country") or "").strip())

    if "shipping_zip" in data:
        updates.append("shipping_zip = %s")
        params.append((data.get("shipping_zip") or "").strip())

    if "shipping_phone" in data:
        updates.append("shipping_phone = %s")
        params.append((data.get("shipping_phone") or "").strip())

    # Password
    if "password" in data:
        password = data.get("password") or ""
        if len(password) < 8:
            return jsonify({"errors": [{"msg": "Password must be at least 8 characters"}]}), 400
        updates.append("password_hash = SHA2(%s,256)")
        params.append(password)

    if not updates:
        return jsonify({"errors": [{"msg": "No fields to update"}]}), 400

    try:
        conn = pool.get_connection()
        cur = conn.cursor()

        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        params.append(user_id)

        cur.execute(query, params)
        conn.commit()

        return jsonify({"ok": True})
    except MySQLError as e:
        # Handle duplicate email
        if getattr(e, "errno", None) == 1062:
            return jsonify({"errors": [{"msg": "Email already registered"}]}), 409
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


# ---------- PRODUCTS / CART / ORDERS ----------

@app.get("/api/products")
def list_products():
    """
    Get all products from database.
    No authentication required.
    
    Returns:
        200: List of products with id, name, and price
        500: Server error
    """
    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, name, price, description, image_url FROM products ORDER BY name")
        products = cur.fetchall()
        
        # Convert Decimal to float for JSON serialization
        for product in products:
            product['price'] = float(product['price'])
        
        return jsonify(products)
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.get("/api/cart")
def get_cart():
    """
    Get current user's cart items.
    Requires authentication.
    
    Returns:
        200: Cart items with subtotal
        401: Not authenticated
        500: Server error
    """
    user_id = get_user_id_from_token()
    
    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Get cart items with product details
        cur.execute(
            """
            SELECT 
                c.id as cart_item_id,
                c.product_id,
                c.quantity,
                p.name as product_name,
                p.price
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = %s
            ORDER BY c.added_at DESC
            """,
            (user_id,),
        )
        
        items = cur.fetchall()
        
        # Calculate subtotal and format response
        subtotal = 0
        formatted_items = []
        for item in items:
            price = float(item['price'])
            qty = item['quantity']
            subtotal += price * qty
            
            formatted_items.append({
                'id': item['cart_item_id'],
                'productId': item['product_id'],
                'productName': item['product_name'],
                'qty': qty,
                'price': price
            })
        
        return jsonify({
            'items': formatted_items,
            'subtotal': subtotal
        })
        
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/cart/items")
def add_item():
    """
    Add item to current user's cart.
    Requires authentication.
    
    Required fields: productId, qty (optional, defaults to 1)
    
    Returns:
        200: Item added successfully
        400: Invalid product or quantity
        401: Not authenticated
        500: Server error
    """
    user_id = get_user_id_from_token()
    
    data = request.get_json(force=True)
    product_id = data.get("productId")
    qty = int(data.get("qty", 1))
    
    if qty < 1:
        return jsonify({"errors": [{"msg": "Quantity must be at least 1"}]}), 400
    
    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Verify product exists
        cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
        if not cur.fetchone():
            return jsonify({"errors": [{"msg": "Invalid product"}]}), 400
        
        # Generate demo_token for the cart_items table constraint
        demo_token = f"user_{user_id}"
        
        # Check if item already in cart
        cur.execute(
            """
            SELECT id, quantity FROM cart_items 
            WHERE user_id = %s AND product_id = %s
            """,
            (user_id, product_id),
        )
        
        existing = cur.fetchone()
        
        if existing:
            # Update quantity
            new_qty = existing['quantity'] + qty
            cur.execute(
                "UPDATE cart_items SET quantity = %s WHERE id = %s",
                (new_qty, existing['id']),
            )
        else:
            # Insert new item
            cur.execute(
                """
                INSERT INTO cart_items (demo_token, user_id, product_id, quantity)
                VALUES (%s, %s, %s, %s)
                """,
                (demo_token, user_id, product_id, qty),
            )
        
        conn.commit()
        return jsonify({"ok": True})
        
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.patch("/api/cart/items/<int:cart_item_id>")
def update_item(cart_item_id):
    """
    Update quantity of item in current user's cart.
    Requires authentication.
    
    Required fields: qty
    
    Returns:
        200: Quantity updated
        400: Invalid quantity
        401: Not authenticated
        404: Item not found or doesn't belong to user
        500: Server error
    """
    user_id = get_user_id_from_token()
    
    data = request.get_json(force=True)
    qty = int(data.get("qty", 1))
    
    if qty < 1:
        return jsonify({"errors": [{"msg": "Quantity must be at least 1"}]}), 400
    
    try:
        conn = pool.get_connection()
        cur = conn.cursor()
        
        # Verify item belongs to user and update
        cur.execute(
            """
            UPDATE cart_items 
            SET quantity = %s 
            WHERE id = %s AND user_id = %s
            """,
            (qty, cart_item_id, user_id),
        )
        
        if cur.rowcount == 0:
            return jsonify({"errors": [{"msg": "Item not found in your cart"}]}), 404
        
        conn.commit()
        return jsonify({"ok": True})
        
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.delete("/api/cart/items/<int:cart_item_id>")
def remove_item(cart_item_id):
    """
    Remove item from current user's cart.
    Requires authentication.
    
    Returns:
        200: Item removed
        401: Not authenticated
        404: Item not found or doesn't belong to user
        500: Server error
    """
    user_id = get_user_id_from_token()
    
    try:
        conn = pool.get_connection()
        cur = conn.cursor()
        
        # Verify item belongs to user and delete
        cur.execute(
            "DELETE FROM cart_items WHERE id = %s AND user_id = %s",
            (cart_item_id, user_id),
        )
        
        if cur.rowcount == 0:
            return jsonify({"errors": [{"msg": "Item not found in your cart"}]}), 404
        
        conn.commit()
        return jsonify({"ok": True})
        
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/orders")
def create_order():
    """
    Create order from current user's cart.
    Requires authentication.
    
    Optional fields: shippingName, shippingEmail, shippingPhone, shippingAddress
    
    Returns:
        201: Order created successfully
        400: Cart is empty
        401: Not authenticated
        500: Server error
    """
    user_id = get_user_id_from_token()
    
    # Read shipping info from request body
    body = request.get_json(silent=True) or {}
    shipping_name = body.get("shippingName")
    shipping_email = body.get("shippingEmail")
    shipping_phone = body.get("shippingPhone")
    shipping_address = body.get("shippingAddress")
    
    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Get cart items
        cur.execute(
            """
            SELECT c.product_id, c.quantity, p.price
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = %s
            """,
            (user_id,),
        )
        
        cart_items = cur.fetchall()
        
        if not cart_items:
            return jsonify({"errors": [{"msg": "Cart is empty"}]}), 400
        
        # Calculate total
        order_total = sum(float(item['price']) * item['quantity'] for item in cart_items)
        
        # Generate order ID and timestamp
        order_id = uuid.uuid4().hex[:12]
        created_at = datetime.datetime.utcnow()
        demo_token = f"user_{user_id}"
        
        # Insert order
        cur.execute(
            """
            INSERT INTO orders (
                id, demo_token, user_id, total, status, created_at,
                shipping_name, shipping_email, shipping_phone, shipping_address
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_id,
                demo_token,
                user_id,
                order_total,
                "pending",
                created_at,
                shipping_name,
                shipping_email,
                shipping_phone,
                shipping_address,
            ),
        )
        
        # Insert order items
        for item in cart_items:
            price = float(item['price'])
            qty = item['quantity']
            line_total = price * qty
            
            cur.execute(
                """
                INSERT INTO order_items
                    (order_id, product_id, quantity, unit_price, line_total)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (order_id, item['product_id'], qty, price, line_total),
            )
        
        # Clear user's cart
        cur.execute("DELETE FROM cart_items WHERE user_id = %s", (user_id,))
        
        conn.commit()
        
        # Build response
        order_obj = {
            "id": order_id,
            "userId": user_id,
            "items": [
                {
                    "productId": item['product_id'],
                    "qty": item['quantity'],
                    "price": float(item['price'])
                }
                for item in cart_items
            ],
            "total": order_total,
            "status": "pending",
            "createdAt": created_at.isoformat(),
        }
        
        return jsonify(order_obj), 201
        
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.get("/api/orders")
def list_orders():
    """
    ✅ FIXED: Get current user's order history FROM DATABASE
    Returns properly formatted data for frontend with subtotal and tax
    
    Returns:
        200: List of orders with items
        401: Not authenticated
        500: Server error
    """
    user_id = get_user_id_from_token()
    
    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Get orders for this user
        cur.execute(
            """
            SELECT id, total, status, created_at, paid_at,
                   shipping_name, shipping_email, shipping_phone, shipping_address
            FROM orders
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        )
        
        orders = cur.fetchall()
        
        # Get items for each order
        result = []
        for order in orders:
            cur.execute(
                """
                SELECT oi.product_id, oi.quantity, oi.unit_price, p.name as product_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
                """,
                (order['id'],),
            )
            
            items = cur.fetchall()
            
            # Calculate subtotal and tax
            subtotal = sum(float(item['unit_price']) * item['quantity'] for item in items)
            tax = subtotal * 0.08
            
            result.append({
                'id': order['id'],
                'total': float(order['total']),
                'subtotal': round(subtotal, 2),  
                'tax': round(tax, 2),            
                'status': order['status'],
                'createdAt': order['created_at'].isoformat() if order['created_at'] else None,
                'paidAt': order['paid_at'].isoformat() if order['paid_at'] else None,
                'shippingName': order.get('shipping_name'),
                'shippingEmail': order.get('shipping_email'),
                'shippingPhone': order.get('shipping_phone'),
                'shippingAddress': order.get('shipping_address'),
                'items': [
                    {
                        'productId': item['product_id'],
                        'productName': item['product_name'],
                        'name': item['product_name'],          
                        'quantity': item['quantity'],          
                        'unitPrice': float(item['unit_price']),  
                        'qty': item['quantity'],
                        'price': float(item['unit_price'])
                    }
                    for item in items
                ]
            })
        
        return jsonify(result)
        
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/payments/mock")
def pay():
    """
    Mock payment processing for an order.
    Requires authentication.
    
    Required fields: orderId, outcome (success/failure)
    
    Returns:
        200: Payment processed
        401: Not authenticated
        404: Order not found or doesn't belong to user
        500: Server error
    """
    user_id = get_user_id_from_token()
    
    data = request.get_json(force=True)
    order_id = data.get("orderId")
    outcome = data.get("outcome", "success")
    
    new_status = "paid" if outcome == "success" else "failed"
    
    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Verify order belongs to user
        cur.execute(
            "SELECT id, total, status FROM orders WHERE id = %s AND user_id = %s",
            (order_id, user_id),
        )
        
        order = cur.fetchone()
        if not order:
            return jsonify({"errors": [{"msg": "Order not found"}]}), 404
        
        # Update order status
        if new_status == "paid":
            cur.execute(
                "UPDATE orders SET status = %s, paid_at = %s WHERE id = %s",
                (new_status, datetime.datetime.utcnow(), order_id),
            )
        else:
            cur.execute(
                "UPDATE orders SET status = %s WHERE id = %s",
                (new_status, order_id),
            )
        
        conn.commit()
        
        # Get updated order with items
        cur.execute(
            """
            SELECT oi.product_id, oi.quantity, oi.unit_price
            FROM order_items oi
            WHERE oi.order_id = %s
            """,
            (order_id,),
        )
        
        items = cur.fetchall()
        
        return jsonify({
            "id": order_id,
            "status": new_status,
            "total": float(order['total']),
            "items": [
                {
                    "productId": item['product_id'],
                    "qty": item['quantity'],
                    "price": float(item['unit_price'])
                }
                for item in items
            ]
        })
        
    except MySQLError as e:
        app.logger.exception(e)
        return jsonify({"errors": [{"msg": "Server error"}]}), 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


# ---------- REGISTER PAYMENT ROUTES ----------

register_payment_routes(app, pool, JWT_SECRET, PAYMENT_ENCRYPTION_KEY)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)