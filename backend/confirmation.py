"""
confirmation.py - Email confirmation service using Resend

Handles:
- Order confirmation emails with delivery tracking
- Beautiful HTML email templates
- Delivery status updates
"""

import resend
import os
from datetime import datetime, timedelta
import random


resend.api_key = "re_2i5ip6tL_NGdbJX6hF56QJ1UeKNknUxWM"

FROM_EMAIL = "onboarding@resend.dev"


def calculate_delivery_date(order_date=None):
    """
    Calculate estimated delivery date (3-5 business days)
    
    Args:
        order_date: Order datetime, defaults to now
        
    Returns:
        date: Estimated delivery date
    """
    if not order_date:
        order_date = datetime.now()
    
    # Add 4 days (middle of 3-5 day range)
    delivery_date = order_date + timedelta(days=4)
    
    # Skip weekends
    while delivery_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
        delivery_date += timedelta(days=1)
    
    return delivery_date.date()


def generate_tracking_number():
    """
    Generate a mock USPS-style tracking number
    Format: 9274899992136XXXXXXXXX (22 digits)
    
    Returns:
        str: Tracking number
    """
    prefix = "92748999"
    suffix = str(random.randint(10000000000000, 99999999999999))
    return prefix + suffix


def format_currency(amount):
    """Format amount as USD currency"""
    return f"${float(amount):.2f}"


def send_order_confirmation(order_data, user_email):
    """
    Send beautiful order confirmation email
    
    Args:
        order_data: Dict with keys:
            - id: order ID
            - total: total amount
            - items: list of {'productName', 'qty', 'price'}
            - shipping_name: recipient name
            - shipping_address: full address
            - estimated_delivery_date: date object
            - tracking_number: tracking string
        user_email: Recipient email address
        
    Returns:
        Resend response dict or None if failed
    """
    
    items_html = ""
    subtotal = 0
    
    for item in order_data['items']:
        line_total = item['price'] * item['qty']
        subtotal += line_total
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #333;">{item['productName']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; color: #666;">{item['qty']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #666;">{format_currency(item['price'])}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #333;">{format_currency(line_total)}</td>
        </tr>
        """
    
    # Calculate tax (8%)
    tax = subtotal * 0.08
    total = order_data['total']
    
    # Format dates
    delivery_date_str = order_data['estimated_delivery_date'].strftime('%B %d, %Y')
    order_date_str = datetime.now().strftime('%B %d, %Y')
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 650px; margin: 30px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
                <h1 style="margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Order Confirmed!</h1>
                <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">Thank you for shopping with eBuy</p>
            </div>
            
            <!-- Order Summary Box -->
            <div style="padding: 35px 30px;">
                <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 10px; margin-bottom: 35px;">
                    <h2 style="margin: 0 0 20px 0; color: #333; font-size: 22px; font-weight: 600;">Order Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; color: #555; font-size: 15px;">Order Number:</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 15px; color: #333;">#{order_data['id']}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #555; font-size: 15px;">Order Date:</td>
                            <td style="padding: 10px 0; text-align: right; font-size: 15px; color: #333;">{order_date_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #555; font-size: 15px;">Estimated Delivery:</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: 16px; color: #667eea;">{delivery_date_str}</td>
                        </tr>
                        <tr style="border-top: 2px solid rgba(0,0,0,0.1);">
                            <td style="padding: 15px 0 0 0; color: #555; font-size: 14px;">Tracking Number:</td>
                            <td style="padding: 15px 0 0 0; text-align: right; font-family: 'Courier New', monospace; font-size: 13px; color: #333; font-weight: 600;">{order_data['tracking_number']}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0 0 0; color: #999; font-size: 12px;">Carrier:</td>
                            <td style="padding: 5px 0 0 0; text-align: right; color: #666; font-size: 12px;">USPS</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Items Ordered -->
                <h2 style="margin: 0 0 20px 0; color: #333; font-size: 22px; font-weight: 600;">Items Ordered</h2>
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 15px 12px; text-align: left; font-weight: 600; color: #555; font-size: 14px;">Product</th>
                                <th style="padding: 15px 12px; text-align: center; font-weight: 600; color: #555; font-size: 14px;">Qty</th>
                                <th style="padding: 15px 12px; text-align: right; font-weight: 600; color: #555; font-size: 14px;">Price</th>
                                <th style="padding: 15px 12px; text-align: right; font-weight: 600; color: #555; font-size: 14px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>
                </div>
                
                <!-- Price Breakdown -->
                <div style="border-top: 2px solid #e0e0e0; padding-top: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-size: 15px;">Subtotal:</td>
                            <td style="padding: 8px 0; text-align: right; font-size: 15px; color: #333;">{format_currency(subtotal)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-size: 15px;">Tax (8%):</td>
                            <td style="padding: 8px 0; text-align: right; font-size: 15px; color: #333;">{format_currency(tax)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-size: 15px;">Shipping:</td>
                            <td style="padding: 8px 0; text-align: right; font-size: 15px; color: #4CAF50; font-weight: 600;">FREE</td>
                        </tr>
                        <tr style="border-top: 2px solid #333;">
                            <td style="padding: 15px 0 0 0; font-size: 20px; font-weight: 700; color: #333;">Total:</td>
                            <td style="padding: 15px 0 0 0; text-align: right; font-size: 24px; font-weight: 700; color: #667eea;">{format_currency(total)}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Shipping Address -->
                <div style="margin-top: 35px; padding: 25px; background-color: #f8f9fa; border-radius: 10px; border-left: 4px solid #667eea;">
                    <h3 style="margin: 0 0 12px 0; color: #333; font-size: 18px; font-weight: 600;">📦 Shipping Address</h3>
                    <p style="margin: 0; color: #555; line-height: 1.8; font-size: 15px;">
                        <strong style="color: #333;">{order_data['shipping_name']}</strong><br>
                        {order_data['shipping_address']}
                    </p>
                </div>
                
                <!-- Track Order Button -->
                <div style="text-align: center; margin-top: 40px;">
                    <a href="http://127.0.0.1:5500/orderstatus.html?order={order_data['id']}" 
                       style="display: inline-block; padding: 16px 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                        Track Your Order →
                    </a>
                </div>
                
                <!-- Help Section -->
                <div style="margin-top: 40px; padding: 20px; background-color: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.8;">
                        <strong>📞 Need Help?</strong><br>
                        Our support team is here for you!<br>
                        Email: <a href="mailto:support@ebuy.com" style="color: #667eea; text-decoration: none; font-weight: 600;">support@ebuy.com</a><br>
                        Phone: <strong>(555) 123-4567</strong>
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                    This email was sent to <strong>{user_email}</strong>
                </p>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                    © 2024 eBuy E-Commerce Platform. All rights reserved.
                </p>
                <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">
                    123 Commerce Street, New York, NY 10001
                </p>
            </div>
            
        </div>
    </body>
    </html>
    """
    
    try:
        # Send email via Resend
        params = {
            "from": FROM_EMAIL,
            "to": [user_email],
            "subject": f"✓ Order Confirmation #{order_data['id']} - Arriving {delivery_date_str}",
            "html": html_content
        }
        
        response = resend.Emails.send(params)
        
        print(f"Email sent successfully!")
        print(f"   To: {user_email}")
        print(f"   Order: #{order_data['id']}")
        print(f"   Email ID: {response.get('id')}")
        
        return response
        
    except Exception as e:
        print(f"Failed to send email: {e}")
        return None


def send_delivery_update(order_id, user_email, status, tracking_url=None):
    """
    Send delivery status update email
    
    Args:
        order_id: Order ID
        user_email: Recipient email
        status: 'shipped', 'out_for_delivery', or 'delivered'
        tracking_url: Optional tracking URL
        
    Returns:
        Resend response or None
    """
    
    status_info = {
        'shipped': {
            'emoji': '📦',
            'title': 'Your Order Has Shipped!',
            'message': 'Your order is on its way!',
            'color': '#3498db'
        },
        'out_for_delivery': {
            'emoji': '🚚',
            'title': 'Out for Delivery!',
            'message': 'Your order is arriving today!',
            'color': '#f39c12'
        },
        'delivered': {
            'emoji': '✅',
            'title': 'Order Delivered!',
            'message': 'Your order has arrived!',
            'color': '#27ae60'
        }
    }.get(status, {
        'emoji': '📬',
        'title': 'Order Update',
        'message': 'Status updated',
        'color': '#95a5a6'
    })
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: {status_info['color']}; color: white; padding: 30px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">{status_info['emoji']}</div>
                <h1 style="margin: 0; font-size: 28px;">{status_info['title']}</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">{status_info['message']}</p>
            </div>
            <div style="padding: 30px; text-align: center;">
                <p style="font-size: 16px; color: #666; margin: 0 0 20px 0;">
                    Order <strong>#{order_id}</strong>
                </p>
                {'<a href="' + tracking_url + '" style="display: inline-block; padding: 15px 40px; background-color: ' + status_info['color'] + '; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Track Package</a>' if tracking_url else ''}
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": FROM_EMAIL,
            "to": [user_email],
            "subject": f"{status_info['emoji']} {status_info['title']} - Order #{order_id}",
            "html": html_content
        }
        
        response = resend.Emails.send(params)
        print(f"Status update sent to {user_email}")
        return response
        
    except Exception as e:
        print(f"Failed to send update: {e}")
        return None