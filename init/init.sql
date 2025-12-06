--  CREATION --
CREATE DATABASE IF NOT EXISTS nimonspedia;
USE nimonspedia;

-- Hapus tabel jika sudah ada untuk memastikan data bersih setiap kali container dibuat ulang
DROP TABLE IF EXISTS order_items, orders, category_items, categories, cart_items, auction_bids, auctions, chat_messages, chat_rooms, push_subscriptions, push_preferences, user_feature_access, products, stores, users;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('BUYER', 'SELLER', 'ADMIN') NOT NULL,
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

CREATE TABLE IF NOT EXISTS auctions (
    auction_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    starting_price INT NOT NULL,
    current_price INT NOT NULL DEFAULT 0,
    min_increment INT NOT NULL,
    quantity INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME DEFAULT NULL,
    status ENUM('scheduled', 'active', 'ended', 'cancelled') DEFAULT 'scheduled',
    winner_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (winner_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS auction_bids (
    bid_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    bidder_id INT NOT NULL,
    bid_amount INT NOT NULL,
    bid_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(auction_id),
    FOREIGN KEY (bidder_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    store_id INT NOT NULL,
    buyer_id INT NOT NULL,
    last_message_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (store_id, buyer_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id),
    FOREIGN KEY (buyer_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    buyer_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_type ENUM('text', 'image', 'item_preview') NOT NULL,
    content TEXT NOT NULL,
    product_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id, buyer_id) REFERENCES chat_rooms(store_id, buyer_id),
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS push_preferences (
    user_id INT PRIMARY KEY,
    chat_enabled BOOLEAN DEFAULT TRUE,
    auction_enabled BOOLEAN DEFAULT TRUE,
    order_enabled BOOLEAN DEFAULT TRUE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS user_feature_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    feature_name ENUM('checkout_enabled', 'chat_enabled', 'auction_enabled') NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    reason TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_chat_rooms_buyer ON chat_rooms(buyer_id);
CREATE INDEX idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC);

CREATE INDEX idx_chat_messages_room ON chat_messages(store_id, buyer_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_unread ON chat_messages(store_id, buyer_id, is_read, created_at);
CREATE INDEX idx_chat_messages_product ON chat_messages(product_id);

CREATE INDEX idx_products_store ON products(store_id, deleted_at);
CREATE INDEX idx_products_name ON products(product_name);

-- DUMMY DATA --

-- Clear all existing data first to avoid conflicts
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE auction_bids;
TRUNCATE TABLE auctions;
TRUNCATE TABLE chat_messages;
TRUNCATE TABLE chat_rooms;
TRUNCATE TABLE push_subscriptions;
TRUNCATE TABLE push_preferences;
TRUNCATE TABLE user_feature_access;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE category_items;
TRUNCATE TABLE products;
TRUNCATE TABLE stores;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS=1;

-- Insert users with same password
INSERT INTO users (email, password, role, name, address, balance)
VALUES
('a@gmail.com',  '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'BUYER',  'Budi Pembeli',  'Jl. Mawar No.1', 5000000), -- user_id: 1
('b@gmail.com', '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'SELLER', 'Susi Penjual', 'Jl. Melati No.2', 0),    -- user_id: 2
('c@gmail.com', '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'SELLER', 'Caca Penjual', 'Jl. Anggrek No. 3',0), -- user_id: 3
('buyer@test.com', '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'BUYER', 'Budi Pembeli', 'Jl. Mawar No. 1, Jakarta', 500000),
('seller@test.com', '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'SELLER', 'Susi Penjual', 'Jl. Melati No. 2, Jakarta', 0),
('admin@nimonspedia.com', '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'ADMIN', 'Admin', 'Admin HQ', 0);

-- Create store for seller user with initial balance 0
INSERT INTO stores (user_id, store_name, store_description, store_logo_path, balance)
SELECT user_id, 'Susy Peralatan Rumah Tangga', 'Menjual berbagai macam peralatan rumah tangga dan dapur berkualitas', '/assets/images/storeLogo/susy_store.jpg', 0
FROM users WHERE role = 'SELLER' LIMIT 1;

-- Insert categories
INSERT INTO categories (name)
VALUES 
('Peralatan Makan'),
('Peralatan Dapur'),
('Perlengkapan Rumah'),
('Alat Minum'),
('Aksesoris Dapur');

-- Insert products for store
INSERT INTO products (store_id, product_name, description, price, stock, main_image_path)
VALUES
(1, 'Gelas Kristal Premium', 'Gelas kristal elegan untuk jamuan minum teh', 75000, 15, '/assets/images/products/gelas_kristal.jpg'),
(1, 'Set Piring Makan', 'Set 6 piring makan premium dengan motif bunga', 250000, 20, '/assets/images/products/set_piring.jpg'),
(1, 'Set Sendok Garpu Gold', 'Set sendok dan garpu lapisan emas 24 pieces', 800000, 10, '/assets/images/products/sendok_garpu_gold.jpg'),
(1, 'Mangkok Keramik', 'Mangkok keramik handmade dengan motif tradisional', 45000, 8, '/assets/images/products/mangkok.jpg'),
(1, 'Teko Traditional', 'Teko keramik traditional dengan filter teh', 120000, 12, '/assets/images/products/teko_tradisional.jpg'),
(1, 'Tempat Bumbu 6 in 1', 'Set tempat bumbu dengan 6 kompartemen', 150000, 25, '/assets/images/products/tempat_bumbu.jpg'),
(1, 'Tatakan Piring', 'Tatakan piring dengan motif elegant', 35000, 30, '/assets/images/products/tatakan_piring.jpg'),
(1, 'Rak Piring Mini', 'Rak piring mini untuk dapur minimalis', 200000, 18, '/assets/images/products/rak_piring_mini.jpg');

-- Link products to categories
INSERT INTO category_items (category_id, product_id)
VALUES
(1, 1), (4, 1), -- Gelas Kristal: Peralatan Makan, Alat Minum
(1, 2), (3, 2), -- Set Piring: Peralatan Makan, Perlengkapan Rumah
(1, 3), (2, 3), (5, 3), -- Set Sendok Garpu: Peralatan Makan, Peralatan Dapur, Aksesoris Dapur
(1, 4), (2, 4), -- Mangkok: Peralatan Makan, Peralatan Dapur
(4, 5), (2, 5), -- Teko: Alat Minum, Peralatan Dapur
(2, 6), (5, 6), -- Tempat Bumbu: Peralatan Dapur, Aksesoris Dapur
(1, 7), (5, 7), -- Tatakan Piring: Peralatan Makan, Aksesoris Dapur
(2, 8), (3, 8); -- Rak Piring: Peralatan Dapur, Perlengkapan Rumah


-- Insert some completed orders to show revenue (produk dapur, makan, rumah, minum, aksesoris)
INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status)
VALUES
(1, 1, 75000, 'Jl. Mawar No. 1, Jakarta', 'received'),      -- Order 1: 1x Gelas Kristal Premium
(1, 1, 250000, 'Jl. Mawar No. 1, Jakarta', 'received'),     -- Order 2: 1x Set Piring Makan
(1, 1, 800000, 'Jl. Mawar No. 1, Jakarta', 'received'),     -- Order 3: 1x Set Sendok Garpu Gold
(1, 1, 45000, 'Jl. Mawar No. 1, Jakarta', 'received'),      -- Order 4: 1x Mangkok Keramik
(1, 1, 120000, 'Jl. Mawar No. 1, Jakarta', 'waiting_approval'), -- Order 5: 1x Teko Traditional
(1, 1, 150000, 'Jl. Mawar No. 1, Jakarta', 'approved'),     -- Order 6: 1x Tempat Bumbu 6 in 1
(1, 1, 35000, 'Jl. Mawar No. 1, Jakarta', 'on_delivery');   -- Order 7: 1x Tatakan Piring


INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal)
VALUES
(1, 1, 1, 75000, 75000),      -- 1x Gelas Kristal Premium
(2, 2, 1, 250000, 250000),    -- 1x Set Piring Makan
(3, 3, 1, 800000, 800000),    -- 1x Set Sendok Garpu Gold
(4, 4, 1, 45000, 45000),      -- 1x Mangkok Keramik
(5, 5, 1, 120000, 120000),    -- 1x Teko Traditional
(6, 6, 1, 150000, 150000),    -- 1x Tempat Bumbu 6 in 1
(7, 7, 1, 35000, 35000);      -- 1x Tatakan Piring

INSERT INTO products (store_id, product_name, description, price, stock, main_image_path)
VALUES
(1, 'Gelas Cantik', 'Gelas kaca bening ukuran 300ml', 25000, 30, '/assets/images/products/gelas.jpg'),        -- product_id: 1
(1, 'Piring Elegan', 'Piring putih porselen diameter 20cm', 40000, 50, '/assets/images/products/piring.jpg'),      -- product_id: 2
(1, 'Sendok Stainless', 'Sendok makan dari bahan stainless steel', 10000, 100, '/assets/images/products/sendok.jpg'), -- product_id: 3
(2, 'Laptop Bekas', 'Laptop Core i5, RAM 8GB, SSD 256GB', 5500000, 5, '/assets/images/products/laptop.jpg'),       -- product_id: 4
(2, 'Mouse Gaming', 'Mouse dengan RGB dan 6 tombol macro', 250000, 15, '/assets/images/products/mouse.jpg'),    -- product_id: 5 
(2, 'Keyboard Mechanical', 'Keyboard blue switch, TKL layout', 750000, 10, '/assets/images/products/keyboard.jpg');  -- product_id: 6 


-- DATA DUMMY UNTUK ORDERS
-- 1. Status: waiting_approval (order_id: 1)
INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status)
VALUES (1, 1, 50000, 'Alamat Budi Pembeli', 'waiting_approval');
INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal)
VALUES (1, 1, 2, 25000, 50000);

-- 2. Status: approved (order_id: 2)
INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status, confirmed_at)
VALUES (1, 2, 750000, 'Alamat Budi Pembeli', 'approved', NOW() - INTERVAL 1 DAY);
INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal)
VALUES (2, 6, 1, 750000, 750000);

-- 3. Status: on_delivery (order_id: 3)
INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status, confirmed_at, delivery_time)
VALUES (1, 1, 80000, 'Alamat Budi Pembeli', 'on_delivery', NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 3 DAY);
INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal)
VALUES (3, 2, 2, 40000, 80000);

-- 4. Status: received (order_id: 4)
INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status, confirmed_at, delivery_time, received_at)
VALUES (1, 2, 500000, 'Alamat Budi Pembeli', 'received', NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 3 DAY);
INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal)
VALUES (4, 5, 2, 250000, 500000);

-- 5. Status: rejected (order_id: 5)
INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status, reject_reason, confirmed_at)
VALUES (1, 1, 10000, 'Alamat Budi Pembeli', 'rejected', 'Stok produk habis.', NOW() - INTERVAL 1 DAY);
INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal)
VALUES (5, 3, 1, 10000, 10000);