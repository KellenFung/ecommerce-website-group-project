from flask import request, jsonify, abort
import jwt
import base64
from mysql.connector import Error as MySQLError


# ========== ENCRYPTION HELPERS ==========
# NOTE: This is a simple XOR encryption for DEMO purposes only.
# In production, use proper encryption like cryptography.fernet or a payment API like Stripe.

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
    except Exception as e:
        print(f"Decryption error: {e}")
        return None


def get_user_from_token(jwt_secret):
    """
    Extract and validate user ID from JWT token in Authorization header.    
    Args:
        jwt_secret: Secret key for JWT validation
        
    Returns:
        int: User ID from token
        
    Raises:
        401: If token is missing, invalid, or expired
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        abort(401, "Missing or invalid Authorization header")
    
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return payload['id']
    except jwt.InvalidTokenError:
        abort(401, "Invalid or expired token")


# ========== ROUTE REGISTRATION ==========

def register_payment_routes(app, pool, jwt_secret, encryption_key):
    """
    Register all payment-related routes to the Flask app.
    ✅ ALL DATA FROM MYSQL DATABASE - NO LOCALSTORAGE
    
    Args:
        app: Flask application instance
        pool: MySQL connection pool
        jwt_secret: JWT secret key for token validation
        encryption_key: Key for encrypting payment data
    """
    
    @app.get("/api/payment-methods")
    def get_payment_methods():
        """
        Returns camelCase keys for frontend
        
        Returns:
            200: List of payment methods
            401: Not authenticated
            500: Server error
        """
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor(dictionary=True)
            
            #Query user's payment methods from database
            cur.execute("""
                SELECT id, card_type, cardholder_name, last_four_digits, 
                       expiry_date, billing_zip, is_default, created_at
                FROM payment_methods 
                WHERE user_id = %s 
                ORDER BY is_default DESC, created_at DESC
            """, (user_id,))
            
            methods = cur.fetchall()
            
            #Convert to camelCase for frontend
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
            return jsonify({"errors": [{"msg": "Server error"}]}), 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.get("/api/payment-methods/<int:payment_id>")
    def get_payment_method(payment_id):
        """
        Returns masked card number for security
        
        Args:
            payment_id: Payment method ID
            
        Returns:
            200: Payment method details
            401: Not authenticated
            404: Payment method not found or doesn't belong to user
            500: Server error
        """
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor(dictionary=True)
            
            # Verify ownership with user_id check
            cur.execute("""
                SELECT id, card_type, cardholder_name, card_number, last_four_digits,
                       expiry_date, billing_zip, is_default
                FROM payment_methods 
                WHERE id = %s AND user_id = %s
            """, (payment_id, user_id))
            
            method = cur.fetchone()
            
            if not method:
                return jsonify({"errors": [{"msg": "Payment method not found"}]}), 404
            
            # Decrypt and mask card number for security
            decrypted_card = simple_decrypt(method['card_number'], encryption_key)
            if decrypted_card and len(decrypted_card) >= 4:
                masked_card = '*' * (len(decrypted_card) - 4) + decrypted_card[-4:]
                masked_card_formatted = ' '.join([masked_card[i:i+4] for i in range(0, len(masked_card), 4)])
            else:
                masked_card_formatted = '**** **** **** ' + method['last_four_digits']
            
            # Return camelCase keys
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
            return jsonify({"errors": [{"msg": "Server error"}]}), 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.post("/api/payment-methods")
    def add_payment_method():
        """
        Add new payment method TO DATABASE
        Tied to user_id from JWT token
        
        Required fields: cardType, cardholderName, cardNumber, expiryDate, cvv, billingZip
        Optional fields: isDefault
        
        Returns:
            201: Payment method created
            400: Missing required fields
            401: Not authenticated
            500: Server error
        """
        user_id = get_user_from_token(jwt_secret)
        data = request.get_json(silent=True) or {}
        
        # Validate required fields
        required_fields = ['cardType', 'cardholderName', 'cardNumber', 'expiryDate', 'cvv', 'billingZip']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                "errors": [{"msg": f"Missing required fields: {', '.join(missing_fields)}"}]
            }), 400
        
        # Extract and validate card number
        card_number = data['cardNumber'].replace(' ', '').replace('-', '')
        if len(card_number) < 13 or len(card_number) > 19:
            return jsonify({"errors": [{"msg": "Invalid card number"}]}), 400
        
        last_four = card_number[-4:]
        
        # Encrypt sensitive data
        encrypted_card = simple_encrypt(card_number, encryption_key)
        encrypted_cvv = simple_encrypt(data['cvv'], encryption_key)
        
        is_default = data.get('isDefault', False)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor()
            
            # If this is set as default, unset all other defaults for this user
            if is_default:
                cur.execute("""
                    UPDATE payment_methods 
                    SET is_default = FALSE 
                    WHERE user_id = %s
                """, (user_id,))
            
            # Insert payment method tied to user_id
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
                is_default
            ))
            
            conn.commit()
            payment_id = cur.lastrowid
            
            return jsonify({
                'message': 'Payment method added successfully',
                'id': payment_id
            }), 201
            
        except MySQLError as e:
            app.logger.exception(e)
            return jsonify({"errors": [{"msg": "Server error"}]}), 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.put("/api/payment-methods/<int:payment_id>")
    def update_payment_method(payment_id):
        """
        Update payment method IN DATABASE
        Only updates fields that are provided in request
        
        Args:
            payment_id: Payment method ID
            
        Returns:
            200: Updated successfully
            400: No fields to update
            401: Not authenticated
            404: Payment method not found or doesn't belong to user
            500: Server error
        """
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
                return jsonify({"errors": [{"msg": "Payment method not found"}]}), 404
            
            update_fields = []
            update_values = []
            
            if 'cardType' in data:
                update_fields.append("card_type = %s")
                update_values.append(data['cardType'])
            
            if 'cardholderName' in data:
                update_fields.append("cardholder_name = %s")
                update_values.append(data['cardholderName'])
            
            # Only update card if it's a new number (not masked)
            if 'cardNumber' in data and '*' not in data['cardNumber']:
                card_number = data['cardNumber'].replace(' ', '').replace('-', '')
                last_four = card_number[-4:]
                encrypted_card = simple_encrypt(card_number, encryption_key)
                
                update_fields.append("card_number = %s")
                update_fields.append("last_four_digits = %s")
                update_values.extend([encrypted_card, last_four])
            
            if 'expiryDate' in data:
                update_fields.append("expiry_date = %s")
                update_values.append(data['expiryDate'])
            
            if 'cvv' in data:
                encrypted_cvv = simple_encrypt(data['cvv'], encryption_key)
                update_fields.append("cvv = %s")
                update_values.append(encrypted_cvv)
            
            if 'billingZip' in data:
                update_fields.append("billing_zip = %s")
                update_values.append(data['billingZip'])
            
            if 'isDefault' in data:
                # If setting as default, unset all others first
                if data['isDefault']:
                    cur.execute("""
                        UPDATE payment_methods 
                        SET is_default = FALSE 
                        WHERE user_id = %s
                    """, (user_id,))
                
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
            return jsonify({"errors": [{"msg": "Server error"}]}), 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.delete("/api/payment-methods/<int:payment_id>")
    def delete_payment_method(payment_id):
        """
        Delete payment method FROM DATABASE
        
        Args:
            payment_id: Payment method ID
            
        Returns:
            200: Deleted successfully
            401: Not authenticated
            404: Payment method not found or doesn't belong to user
            500: Server error
        """
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor()
            
            # Delete payment method (user_id check ensures ownership)
            cur.execute("""
                DELETE FROM payment_methods 
                WHERE id = %s AND user_id = %s
            """, (payment_id, user_id))
            
            if cur.rowcount == 0:
                return jsonify({"errors": [{"msg": "Payment method not found"}]}), 404
            
            conn.commit()
            
            return jsonify({'message': 'Payment method deleted successfully'})
            
        except MySQLError as e:
            app.logger.exception(e)
            return jsonify({"errors": [{"msg": "Server error"}]}), 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

    
    @app.get("/api/payment-methods/default")
    def get_default_payment_method():
        """
        Get default payment method FROM DATABASE
        Used for checkout autofill
        
        Returns:
            200: Default payment method
            401: Not authenticated
            404: No default payment method set
            500: Server error
        """
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor(dictionary=True)
            
            # Get default payment method for this user
            cur.execute("""
                SELECT id, card_type, cardholder_name, last_four_digits, expiry_date
                FROM payment_methods 
                WHERE user_id = %s AND is_default = TRUE
                LIMIT 1
            """, (user_id,))
            
            method = cur.fetchone()
            
            if not method:
                return jsonify({"errors": [{"msg": "No default payment method set"}]}), 404
            
            # Return camelCase keys
            return jsonify({
                'id': method['id'],
                'cardType': method['card_type'],
                'cardholderName': method['cardholder_name'],
                'lastFourDigits': method['last_four_digits'],
                'expiryDate': method['expiry_date']
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
    
    
    @app.put("/api/payment-methods/<int:payment_id>/set-default")
    def set_default_payment_method(payment_id):
        """
        Set payment method as default IN DATABASE
        
        Args:
            payment_id: Payment method ID
            
        Returns:
            200: Set as default successfully
            401: Not authenticated
            404: Payment method not found or doesn't belong to user
            500: Server error
        """
        user_id = get_user_from_token(jwt_secret)
        
        try:
            conn = pool.get_connection()
            cur = conn.cursor()
            
            # Verify ownership
            cur.execute("""
                SELECT id FROM payment_methods 
                WHERE id = %s AND user_id = %s
            """, (payment_id, user_id))
            
            if not cur.fetchone():
                return jsonify({"errors": [{"msg": "Payment method not found"}]}), 404
            
            # Unset all defaults for this user
            cur.execute("""
                UPDATE payment_methods 
                SET is_default = FALSE 
                WHERE user_id = %s
            """, (user_id,))
            
            # Set this one as default
            cur.execute("""
                UPDATE payment_methods 
                SET is_default = TRUE 
                WHERE id = %s AND user_id = %s
            """, (payment_id, user_id))
            
            conn.commit()
            
            return jsonify({'message': 'Default payment method updated successfully'})
            
        except MySQLError as e:
            app.logger.exception(e)
            return jsonify({"errors": [{"msg": "Server error"}]}), 500
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass
