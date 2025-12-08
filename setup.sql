-- Setup SQL for eBuy Application
CREATE DATABASE IF NOT EXISTS ebuy_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ebuy_app;

CREATE USER IF NOT EXISTS 'ebuy_user'@'localhost' IDENTIFIED BY 'Software5432';
GRANT ALL PRIVILEGES ON ebuy_app.* TO 'ebuy_user'@'localhost';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name  VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  address TEXT NULL,
  shipping_street VARCHAR(255) NULL,
  shipping_city   VARCHAR(120) NULL,
  shipping_state  VARCHAR(80)  NULL,
  shipping_country VARCHAR(120) NULL,   
  shipping_zip    VARCHAR(20)  NULL,
  shipping_phone  VARCHAR(50)  NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Product Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) NOT NULL PRIMARY KEY,   
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products
INSERT INTO products (id, name, price) VALUES
  ('Refrigerator', 'Refrigerator', 500.00),
  ('Microwave', 'Microwave', 300.00),
  ('Dishwasher', 'Dishwasher', 450.00),
  ('Oven', 'Oven', 550.00),
  ('Washer', 'Washer', 600.00),
  ('Dryer', 'Dryer', 600.00),
  ('Blender', 'Blender', 100.00),
  ('DripCoffee', 'DripCoffee', 150.00),
  ('Laptop', 'Laptop', 200.00),
  ('TV', 'TV', 399.00),
  ('Speaker', 'Speaker', 199.00),
  ('OutDatedVinyl', 'Vinyl', 50.00),
  ('Switch2', 'Switch 2', 499.00),
  ('PlayStation5', 'PlayStation 5', 599.00),
  ('XboxS', 'Xbox Series S', 399.00),
  ('OutDatedGameBoy', 'Game Boy', 59.00), 
  ('Headphones', 'Headphones', 49.00),
  ('IPad', 'Tablet / iPad', 299.00),
  ('GamingDesktop', 'Gaming Desktop', 999.00),
  ('Printer', 'Printer', 230.00),
  ('iPhone', 'iPhone 17', 920.00),
  ('Samsung', 'Samsung Galaxy', 930.00),
  ('Airpods', 'Airpods Pro', 200.00),
  ('PhoneCharger', 'Phone Charger', 30.00),
  ('LaptopCharger', 'Laptop Charger', 60.00),
  ('Cookware', 'Cookware Set', 100.00),
  ('Toaster', 'Toaster', 20.00),
  ('Cooker', 'Rice Cooker', 40.00),
  ('WaffleMaker', 'Waffle Maker', 60.00),
  ('SmartSpeaker', 'Smart Speaker', 60.00),
  ('Monitor', 'Computer Monitor', 750.00),
  ('Camera', 'Camera', 700.00),
  ('SmartWatch', 'Smart Watch', 299.00),
  ('Vaccum', 'Vacuum', 100.00)
ON DUPLICATE KEY UPDATE price = VALUES(price);


-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  demo_token VARCHAR(64) NOT NULL,   
  user_id INT NULL,
  product_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_token_product (demo_token, product_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order Table (WITH DELIVERY TRACKING)
CREATE TABLE IF NOT EXISTS orders (
  id CHAR(12) NOT NULL PRIMARY KEY,  
  demo_token VARCHAR(64) NOT NULL,   
  user_id INT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending','paid','shipped','delivered','failed','cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  
  estimated_delivery_date DATE NULL,
  tracking_number VARCHAR(50) NULL,
  carrier VARCHAR(50) DEFAULT 'USPS',

  -- Shipping information
  shipping_name VARCHAR(200) NULL,
  shipping_email VARCHAR(190) NULL,
  shipping_phone VARCHAR(50) NULL,
  shipping_address TEXT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Index for order queries
CREATE INDEX idx_orders_user_created
  ON orders (user_id, created_at DESC);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(12) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,

  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_order_items_order
  ON order_items (order_id);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  card_type VARCHAR(50) NOT NULL,          
  cardholder_name VARCHAR(200) NOT NULL,
  card_number TEXT NOT NULL,               
  last_four_digits CHAR(4) NOT NULL,
  expiry_date CHAR(5) NOT NULL,           
  cvv TEXT NOT NULL,                      
  billing_zip VARCHAR(20) NOT NULL,

  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_payment_methods_user
  ON payment_methods (user_id, is_default DESC, created_at DESC);