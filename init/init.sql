--  CREATION --

CREATE DATABASE IF NOT EXISTS nimonspedia;
USE nimonspedia;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('BUYER', 'SELLER') NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    balance INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
    store_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    store_name VARCHAR(255) NOT NULL UNIQUE,
    store_description TEXT,
    store_logo_path VARCHAR(255),
    balance INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    stock INT DEFAULT 0,
    main_image_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS category_items (
    category_id INT NOT NULL,
    product_id INT NOT NULL,
    PRIMARY KEY (category_id, product_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    store_id INT NOT NULL,
    total_price INT NOT NULL,
    shipping_address TEXT NOT NULL,
    status ENUM('waiting_approval', 'approved', 'rejected', 'on_delivery', 'received')
        DEFAULT 'waiting_approval',
    reject_reason TEXT DEFAULT NULL,
    confirmed_at DATETIME DEFAULT NULL,
    delivery_time DATETIME DEFAULT NULL,
    received_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price_at_order INT NOT NULL,
    subtotal INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- DUMMY DATA --
INSERT IGNORE INTO users (email, password, role, name, address, balance)
VALUES
('a@gmail.com',  '$2y$10$YphE6zvExfxXpqZfJykcIuUdr9JrAfmVqj6zpgKk3M/IFSt/wkWJS', 'BUYER',  'Budi Pembeli',  'Jl. Mawar No.1', 500000), -- hash dari 123456
('b@gmail.com', '$2y$10$YphE6zvExfxXpqZfJykcIuUdr9JrAfmVqj6zpgKk3M/IFSt/wkWJS', 'SELLER', 'Susi Penjual', 'Jl. Melati No.2', 0);

INSERT IGNORE INTO stores (user_id, store_name, store_description, store_logo_path, balance)
VALUES
(1, 'Toko Susi', 'Menjual berbagai perlengkapan rumah tangga', '/assets/images/logo.png', 1500000);

INSERT IGNORE INTO products (store_id, product_name, description, price, stock, main_image_path)
VALUES
(1, 'Gelas Cantik', 'Gelas kaca bening ukuran 300ml', 25000, 30, '/assets/images/gelas.jpg'),
(1, 'Piring Elegan', 'Piring putih porselen diameter 20cm', 40000, 50, '/assets/images/piring.jpg'),
(1, 'Sendok Stainless', 'Sendok makan dari bahan stainless steel', 10000, 100, '/assets/images/sendok.jpg');