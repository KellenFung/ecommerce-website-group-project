from flask import request, jsonify, abort
import jwt
import base64
from mysql.connector import Error as MySQLError


# Encryption helper functions
def simple_encrypt(data, key):
    """Simple XOR encryption - for demo only"""
    key_bytes = key.encode()
    data_bytes = data.encode()
    encrypted = bytearray()
    
    for i, byte in enumerate(data_bytes):
        encrypted.append(byte ^ key_bytes[i % len(key_bytes)])
    
    return base64.b64encode(encrypted).decode()


def simple_decrypt(encrypted_data, key):
    """Simple XOR decryption - for demo only"""
    try:
        key_bytes = key.encode()
        encrypted_bytes = base64.b64decode(encrypted_data.encode())
        decrypted = bytearray()
        
        for i, byte in enumerate(encrypted_bytes):
            decrypted.append(byte ^ key_bytes[i % len(key_bytes)])
        
        return decrypted.decode()
    except:
        return None


def get_user_from_token(jwt_secret):
    """Extract user ID from JWT token in Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        abort(401, "Unauthorized")
    
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return payload['id']
    except jwt.InvalidTokenError:
        abort(401, "Invalid token")


def register_payment_routes(app, pool, jwt_secret, encryption_key):
    """
    Register all payment-related routes to the Flask app
    
    Args:
        app: Flask application instance
        pool: MySQL connection pool
        jwt_secret: JWT secret key for token validation
        encryption_key: Key for encrypting payment data
    """
    
    @app.get("/api/payment-methods")
    def get_payment_methods():
        """Get all payment methods for the authenticated user"""
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor(dictionary=True)
            
            cur.execute("""
                SELECT id, card_type, cardholder_name, last_four_digits, 
                       expiry_date, billing_zip, is_default, created_at
                FROM payment_methods 
                WHERE user_id = %s 
                ORDER BY is_default DESC, created_at DESC
            """, (user_id,))
            
            methods = cur.fetchall()
            
            # Format response
            result = []
            for method in methods:
                result.append({
                    'id': method['id'],
                    'cardType': method['card_type'],
                    'cardholderName': method['cardholder_name'],
                    'lastFourDigits': method['last_four_digits'],
                    'expiryDate': method['expiry_date'],
                    'billingZip': method['billing_zip'],
                    'isDefault': bool(method['is_default']),
                    'createdAt': method['created_at'].isoformat() if method['created_at'] else None
                })
            
            return jsonify(result)
            
        except MySQLError as e:
            app.logger.exception(e)
            return "Server error", 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.get("/api/payment-methods/<int:payment_id>")
    def get_payment_method(payment_id):
        """Get single payment method by ID"""
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor(dictionary=True)
            
            cur.execute("""
                SELECT id, card_type, cardholder_name, card_number, last_four_digits,
                       expiry_date, billing_zip, is_default
                FROM payment_methods 
                WHERE id = %s AND user_id = %s
            """, (payment_id, user_id))
            
            method = cur.fetchone()
            
            if not method:
                abort(404, "Payment method not found")
            
            # Decrypt card number and mask it for security
            decrypted_card = simple_decrypt(method['card_number'], encryption_key)
            if decrypted_card:
                masked_card = '*' * (len(decrypted_card) - 4) + decrypted_card[-4:]
                masked_card_formatted = ' '.join([masked_card[i:i+4] for i in range(0, len(masked_card), 4)])
            else:
                masked_card_formatted = '**** **** **** ' + method['last_four_digits']
            
            result = {
                'id': method['id'],
                'cardType': method['card_type'],
                'cardholderName': method['cardholder_name'],
                'cardNumber': masked_card_formatted,
                'expiryDate': method['expiry_date'],
                'billingZip': method['billing_zip'],
                'isDefault': bool(method['is_default'])
            }
            
            return jsonify(result)
            
        except MySQLError as e:
            app.logger.exception(e)
            return "Server error", 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.post("/api/payment-methods")
    def add_payment_method():
        """Add new payment method"""
        user_id = get_user_from_token(jwt_secret)
        data = request.get_json(silent=True) or {}
        
        # Validate required fields
        required_fields = ['cardType', 'cardholderName', 'cardNumber', 'expiryDate', 'cvv', 'billingZip']
        if not all(field in data for field in required_fields):
            return jsonify({"errors": [{"msg": "Missing required fields"}]}), 400
        
        # Extract last 4 digits
        card_number = data['cardNumber'].replace(' ', '')
        last_four = card_number[-4:]
        
        # Encrypt sensitive data
        encrypted_card = simple_encrypt(card_number, encryption_key)
        encrypted_cvv = simple_encrypt(data['cvv'], encryption_key)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor()
            
            # Insert payment method
            cur.execute("""
                INSERT INTO payment_methods 
                (user_id, card_type, cardholder_name, card_number, last_four_digits, 
                 expiry_date, cvv, billing_zip, is_default)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                data['cardType'],
                data['cardholderName'],
                encrypted_card,
                last_four,
                data['expiryDate'],
                encrypted_cvv,
                data['billingZip'],
                data.get('isDefault', False)
            ))
            
            conn.commit()
            payment_id = cur.lastrowid
            
            return jsonify({
                'message': 'Payment method added successfully',
                'id': payment_id
            }), 201
            
        except MySQLError as e:
            app.logger.exception(e)
            return "Server error", 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.put("/api/payment-methods/<int:payment_id>")
    def update_payment_method(payment_id):
        """Update payment method"""
        user_id = get_user_from_token(jwt_secret)
        data = request.get_json(silent=True) or {}
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor()
            
            # Verify ownership
            cur.execute("""
                SELECT id FROM payment_methods 
                WHERE id = %s AND user_id = %s
            """, (payment_id, user_id))
            
            if not cur.fetchone():
                abort(404, "Payment method not found")
            
            # Prepare update data
            card_number = data.get('cardNumber', '').replace(' ', '').replace('*', '')
            
            # Only encrypt if it's a new card number (not masked)
            if card_number and '*' not in data.get('cardNumber', ''):
                last_four = card_number[-4:]
                encrypted_card = simple_encrypt(card_number, encryption_key)
            else:
                # Keep existing card data
                last_four = None
                encrypted_card = None
            
            encrypted_cvv = simple_encrypt(data['cvv'], encryption_key) if data.get('cvv') else None
            
            # Build update query
            update_fields = []
            update_values = []
            
            if 'cardType' in data:
                update_fields.append("card_type = %s")
                update_values.append(data['cardType'])
            
            if 'cardholderName' in data:
                update_fields.append("cardholder_name = %s")
                update_values.append(data['cardholderName'])
            
            if encrypted_card:
                update_fields.append("card_number = %s")
                update_fields.append("last_four_digits = %s")
                update_values.extend([encrypted_card, last_four])
            
            if 'expiryDate' in data:
                update_fields.append("expiry_date = %s")
                update_values.append(data['expiryDate'])
            
            if encrypted_cvv:
                update_fields.append("cvv = %s")
                update_values.append(encrypted_cvv)
            
            if 'billingZip' in data:
                update_fields.append("billing_zip = %s")
                update_values.append(data['billingZip'])
            
            if 'isDefault' in data:
                update_fields.append("is_default = %s")
                update_values.append(data['isDefault'])
            
            if not update_fields:
                return jsonify({'message': 'No fields to update'}), 400
            
            update_values.extend([payment_id, user_id])
            
            query = f"""
                UPDATE payment_methods 
                SET {', '.join(update_fields)}
                WHERE id = %s AND user_id = %s
            """
            
            cur.execute(query, update_values)
            conn.commit()
            
            return jsonify({'message': 'Payment method updated successfully'})
            
        except MySQLError as e:
            app.logger.exception(e)
            return "Server error", 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.delete("/api/payment-methods/<int:payment_id>")
    def delete_payment_method(payment_id):
        """Delete payment method"""
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor()
            
            # Delete payment method
            cur.execute("""
                DELETE FROM payment_methods 
                WHERE id = %s AND user_id = %s
            """, (payment_id, user_id))
            
            if cur.rowcount == 0:
                abort(404, "Payment method not found")
            
            conn.commit()
            
            return jsonify({'message': 'Payment method deleted successfully'})
            
        except MySQLError as e:
            app.logger.exception(e)
            return "Server error", 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.get("/api/payment-methods/default")
    def get_default_payment_method():
        """Get default payment method for checkout"""
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor(dictionary=True)
            
            cur.execute("""
                SELECT id, card_type, cardholder_name, last_four_digits, expiry_date
                FROM payment_methods 
                WHERE user_id = %s AND is_default = TRUE
                LIMIT 1
            """, (user_id,))
            
            method = cur.fetchone()
            
            if not method:
                abort(404, "No default payment method set")
            
            return jsonify({
                'id': method['id'],
                'cardType': method['card_type'],
                'cardholderName': method['cardholder_name'],
                'lastFourDigits': method['last_four_digits'],
                'expiryDate': method['expiry_date']
            })
            
        except MySQLError as e:
            app.logger.exception(e)
            return "Server error", 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass
