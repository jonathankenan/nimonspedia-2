<?php
namespace App\Models;
use mysqli;

class Order {
    private $conn;
    private $table = "orders";

    public function __construct($db) {
        $this->conn = $db;
    }
    public function create($buyerId, $storeId, $totalPrice, $shippingAddress, $status = 'waiting_approval') {
        $stmt = $this->conn->prepare("
            INSERT INTO {$this->table} (buyer_id, store_id, total_price, shipping_address, status)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("iiiss", $buyerId, $storeId, $totalPrice, $shippingAddress, $status);
        return $stmt->execute();
    }

    public function updateStatus($orderId, $status, $reason = null) {
        $stmt = $this->conn->prepare("
            UPDATE {$this->table} SET status = ?, reject_reason = ? WHERE order_id = ?
        ");
        $stmt->bind_param("ssi", $status, $reason, $orderId);
        return $stmt->execute();
    }

    public function getByBuyer($buyerId) {
        $stmt = $this->conn->prepare("
            SELECT * FROM {$this->table} WHERE buyer_id = ?
        ");
        $stmt->bind_param("i", $buyerId);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // Membuat order baru dan item-itemnya dari keranjang dalam satu transaksi. 
    // Ini memastikan semua proses (kurangi saldo, stok, dll) berhasil atau semuanya dibatalkan.

    public function createOrderFromCart(int $buyerId, array $itemsByStore, string $shippingAddress): bool {
        // 1. Mulai Transaksi Database
        $this->conn->begin_transaction();

        try {
            // Loop untuk setiap toko di keranjang
            foreach ($itemsByStore as $storeId => $storeData) {
                $totalPrice = $storeData['total_price'];

                // 2. Kurangi saldo buyer (Hold Balance)
                $stmt = $this->conn->prepare("UPDATE users SET balance = balance - ? WHERE user_id = ? AND balance >= ?");
                $stmt->bind_param("iii", $totalPrice, $buyerId, $totalPrice);
                if (!$stmt->execute() || $stmt->affected_rows === 0) {
                    throw new \Exception("Saldo tidak mencukupi untuk salah satu pesanan.");
                }

                // 3. Buat entri di tabel 'orders'
                $stmt = $this->conn->prepare("INSERT INTO orders (buyer_id, store_id, total_price, shipping_address) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("iiis", $buyerId, $storeId, $totalPrice, $shippingAddress);
                if (!$stmt->execute()) {
                    throw new \Exception("Gagal membuat data order.");
                }
                $orderId = $this->conn->insert_id;

                // Loop untuk setiap item di dalam toko
                foreach ($storeData['items'] as $item) {
                    // 4. Kurangi stok produk
                    $stmt = $this->conn->prepare("UPDATE products SET stock = stock - ? WHERE product_id = ? AND stock >= ?");
                    $stmt->bind_param("iii", $item['quantity'], $item['product_id'], $item['quantity']);
                    if (!$stmt->execute() || $stmt->affected_rows === 0) {
                        throw new \Exception("Stok produk '{$item['product_name']}' tiba-tiba habis.");
                    }

                    // 5. Buat entri di tabel 'order_items'
                    $subtotal = $item['price'] * $item['quantity'];
                    $stmt = $this->conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal) VALUES (?, ?, ?, ?, ?)");
                    $stmt->bind_param("iiiii", $orderId, $item['product_id'], $item['quantity'], $item['price'], $subtotal);
                    if (!$stmt->execute()) {
                        throw new \Exception("Gagal menyimpan detail item pesanan.");
                    }
                }
            }

            // 6. Jika semua order berhasil, hapus semua item dari keranjang buyer
            $stmt = $this->conn->prepare("DELETE FROM cart_items WHERE buyer_id = ?");
            $stmt->bind_param("i", $buyerId);
            if (!$stmt->execute()) {
                throw new \Exception("Gagal membersihkan keranjang setelah checkout.");
            }

            // 7. Jika semua proses berhasil, simpan semua perubahan secara permanen
            $this->conn->commit();
            return true;

        } catch (\Exception $e) {
            // 8. Jika ada SATU saja yang gagal, batalkan SEMUA perubahan
            $this->conn->rollback();
            // Simpan pesan error di session untuk ditampilkan di halaman checkout
            $_SESSION['checkout_error'] = $e->getMessage();
            return false;
        }
    }
    
    public function getOrderHistory(int $buyerId, string $filterStatus = 'all'): array {
        $orders = [];
        
        // Query utama untuk mengambil semua pesanan dari seorang buyer
        $sql = "
            SELECT 
                o.order_id,
                o.created_at,
                o.total_price,
                o.status,
                o.shipping_address,
                o.reject_reason,
                s.store_name
            FROM orders o
            JOIN stores s ON o.store_id = s.store_id
            WHERE o.buyer_id = ?
        ";

        // Tambahkan filter status jika ada (selain 'all')
        if ($filterStatus !== 'all' && $filterStatus !== '') {
            $sql .= " AND o.status = ?";
        }

        $sql .= " ORDER BY o.created_at DESC"; // Urutkan dari yang terbaru

        $stmt = $this->conn->prepare($sql);
        if ($filterStatus !== 'all' && $filterStatus !== '') {
            $stmt->bind_param("is", $buyerId, $filterStatus);
        } else {
            $stmt->bind_param("i", $buyerId);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $orderIds = [];
        while($row = $result->fetch_assoc()) {
            $orders[$row['order_id']] = $row;
            $orders[$row['order_id']]['items'] = [];
            $orderIds[] = $row['order_id'];
        }

        if (empty($orderIds)) {
            return [];
        }

        // Query kedua untuk mengambil semua item dari pesanan-pesanan di atas
        $ids = implode(',', $orderIds);
        $itemSql = "
            SELECT 
                oi.order_id,
                oi.quantity,
                oi.price_at_order,
                p.product_name,
                p.main_image_path
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id IN ($ids)
        ";

        $itemResult = $this->conn->query($itemSql);
        while($itemRow = $itemResult->fetch_assoc()) {
            $orders[$itemRow['order_id']]['items'][] = $itemRow;
        }

        return $orders;
    }
}