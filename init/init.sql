--  CREATION --
CREATE DATABASE IF NOT EXISTS nimonspedia;
USE nimonspedia;

-- Hapus tabel jika sudah ada untuk memastikan data bersih setiap kali container dibuat ulang
DROP TABLE IF EXISTS order_items, orders, category_items, categories, cart_items, products, stores, users;

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


-- DATA DUMMY 

INSERT INTO users (email, password, role, name, address, balance)
VALUES
('a@gmail.com',  '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'BUYER',  'Budi Pembeli',  'Jl. Mawar No.1', 5000000), -- user_id: 1
('b@gmail.com', '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'SELLER', 'Susi Penjual', 'Jl. Melati No.2', 0),    -- user_id: 2
('c@gmail.com', '$2y$10$zzrJzY8Ak7pHkQzd7JtpUuMTPgRiRvzT42WnSBNGGvdWZb5sOjhiC', 'SELLER', 'Caca Penjual', 'Jl. Anggrek No. 3',0); -- user_id: 3

INSERT INTO stores (user_id, store_name, store_description, store_logo_path, balance)
VALUES
(1, 'Toko Susi', 'Menjual berbagai perlengkapan rumah tangga', '/assets/images/logo.png', 1500000),      -- store_id: 1
(3, 'Toko Caca Elektronik', 'Menjual barang elektronik bekas berkualitas', '/assets/images/logo.png',3000000); -- store_id: 2

INSERT INTO products (store_id, product_name, description, price, stock, main_image_path)
VALUES
(1, 'Gelas Cantik', 'Gelas kaca bening ukuran 300ml', 25000, 30, '/assets/images/gelas.jpg'),        -- product_id: 1
(1, 'Piring Elegan', 'Piring putih porselen diameter 20cm', 40000, 50, '/assets/images/piring.jpg'),      -- product_id: 2
(1, 'Sendok Stainless', 'Sendok makan dari bahan stainless steel', 10000, 100, '/assets/images/sendok.jpg'), -- product_id: 3
(2, 'Laptop Bekas', 'Laptop Core i5, RAM 8GB, SSD 256GB', 5500000, 5, '/assets/images/laptop.jpg'),       -- product_id: 4
(2, 'Mouse Gaming', 'Mouse dengan RGB dan 6 tombol macro', 250000, 15, '/assets/images/mouse.jpg'),    -- product_id: 5 
(2, 'Keyboard Mechanical', 'Keyboard blue switch, TKL layout', 750000, 10, '/assets/images/keyboard.jpg');  -- product_id: 6 


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