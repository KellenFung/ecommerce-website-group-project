CREATE DATABASE IF NOT EXISTS bestbuy_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bestbuy_app;

CREATE USER IF NOT EXISTS 'bestbuy_user'@'localhost' IDENTIFIED BY 'Software5432';
GRANT ALL PRIVILEGES ON bestbuy_app.* TO 'bestbuy_user'@'localhost';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  address TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO products (id, name, price) VALUES
  ('Refrigerator', 'Refrigerator', 500.00),
  ('Microwave', 'Microwave', 300.00),
  ('Dishwasher', 'Dishwasher', 450.00),
  ('Oven', 'Oven', 550.00),
  ('Washer', 'Washer', 600.00),
  ('Dryer', 'Dryer', 600.00),
  ('Blender', 'Blender', 100.00),
  ('DripCoffee', 'Drip Coffee', 150.00),
  ('Laptop', 'Laptop', 200.00),
  ('TV', 'TV', 399.00),
  ('Speaker', 'Speaker', 199.00),
  ('OutDatedVinyl', 'Vinyl', 50.00),
  ('Switch2', 'Switch 2', 499.00),
  ('PlayStation5', 'PlayStation 5', 599.00),
  ('XboxS', 'Xbox Series S', 399.00),
  ('OutDatedGameBoy', 'Game Boy', 1.00),
  ('Headphones', 'Headphones', 49.00),
  ('IPad', 'Tablet / iPad', 299.00),
  ('GamingDesktop', 'Gaming Desktop', 999.00),
  ('Printer', 'Printer', 230.00),
  ('Monitor', 'Computer Monitor', 750.00),
  ('Camera', 'Camera', 700.00),
  ('SmartWatch', 'Smart Watch', 299.00),
  ('Vaccum', 'Vacuum', 100.00)
ON DUPLICATE KEY UPDATE price = VALUES(price);

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

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(12) NOT NULL PRIMARY KEY,
  demo_token VARCHAR(64) NOT NULL,
  user_id INT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  paid_at DATETIME NULL,

  shipping_name VARCHAR(200) NULL,
  shipping_email VARCHAR(190) NULL,
  shipping_phone VARCHAR(50) NULL,
  shipping_address TEXT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
