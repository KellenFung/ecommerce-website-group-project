import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import mysql.connector
from mysql.connector import pooling, Error as MySQLError
from email_validator import validate_email, EmailNotValidError

PORT = 8000
JWT_SECRET = "dev_secret"
DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "bestbuy_user",
    "password": "Software5432",
    "database": "bestbuy_app"
}

app = Flask(__name__)
CORS(app)
pool = pooling.MySQLConnectionPool(pool_name="bestbuy_pool", pool_size=5, **DB_CONFIG)

def issue_token(user):
    payload = {"id": user["id"], "email": user["email"], "name": user["name"]}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

@app.get("/api/health")
def health():
    return jsonify({"ok": True})

NAME_RE = re.compile(r"^.{2,}$")

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    address = (data.get("address") or "").strip() or None

    try:
        validate_email(email)
    except EmailNotValidError:
        return jsonify({"errors": [{"msg": "Invalid email"}]}), 400
    if not NAME_RE.match(name):
        return jsonify({"errors": [{"msg": "Name must be at least 2 characters"}]}), 400
    if len(password) < 8:
        return jsonify({"errors": [{"msg": "Password must be at least 8 characters"}]}), 400

    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "INSERT INTO users (name, email, password_hash, address) VALUES (%s, %s, SHA2(%s,256), %s)",
            (name, email, password, address),
        )
        conn.commit()
        return jsonify({"id": cur.lastrowid, "email": email})
    except MySQLError as e:
        if getattr(e, "errno", None) == 1062:
            return ("Email already registered", 409)
        app.logger.exception(e)
        return ("Server error", 500)
    finally:
        try:
            cur.close(); conn.close()
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
            "SELECT id, name, email FROM users WHERE email=%s AND password_hash=SHA2(%s,256) LIMIT 1",
            (email, password),
        )
        row = cur.fetchone()
        if not row:
            return ("Invalid credentials", 401)
        token = issue_token(row)
        return jsonify({"token": token, "user": row})
    except MySQLError as e:
        app.logger.exception(e)
        return ("Server error", 500)
    finally:
        try:
            cur.close(); conn.close()
        except Exception:
            pass

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, debug=True)
