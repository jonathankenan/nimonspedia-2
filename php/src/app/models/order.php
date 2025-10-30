<?php
namespace App\Models;
use mysqli;

class Order {
    private $conn;
    private $table = "orders";
    private $itemsTable = "order_items";

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function countPendingByStoreId($storeId) {
        $sql = "SELECT COUNT(*) as total FROM {$this->table} 
                WHERE store_id = ? AND status IN ('waiting_approval', 'approved', 'on_delivery')";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row['total'] ?? 0;
    }

    public function create($buyerId, $storeId, $totalPrice, $shippingAddress, $status = 'waiting_approval') {
        $stmt = $this->conn->prepare("
            INSERT INTO {$this->table} (buyer_id, store_id, total_price, shipping_address, status)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("iiiss", $buyerId, $storeId, $totalPrice, $shippingAddress, $status);
        return $stmt->execute();
    }

    public function calculateTotalRevenueByStoreId($storeId) {
        $sql = "SELECT SUM(total_price) as total 
                FROM {$this->table} 
                WHERE store_id = ? AND status = 'received'";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row['total'] ?? 0;
    }

    public function getOrdersByStoreId($storeId, $status = null, $page = 1, $perPage = 10, $search = '') {
        $offset = ($page - 1) * $perPage;
        $where = ["o.store_id = ?"];
        $params = [$storeId];
        $types = "i";

        if ($status) {
            $where[] = "o.status = ?";
            $params[] = $status;
            $types .= "s";
        }

        if ($search) {
            $where[] = "(o.order_id LIKE ? OR u.name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $types .= "ss";
        }

        $whereClause = implode(" AND ", $where);

        $sql = "SELECT o.*, u.name as buyer_name, u.email as buyer_email, 
                GROUP_CONCAT(CONCAT(p.product_name, ' (', oi.quantity, ')') SEPARATOR ', ') as product_list
                FROM {$this->table} o
                INNER JOIN users u ON o.buyer_id = u.user_id
                INNER JOIN {$this->itemsTable} oi ON o.order_id = oi.order_id
                INNER JOIN products p ON oi.product_id = p.product_id
                WHERE {$whereClause}
                GROUP BY o.order_id
                ORDER BY o.created_at DESC
                LIMIT ? OFFSET ?";

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new \Exception("Query preparation failed: " . $this->conn->error);
        }

        // Simpan params/types untuk count sebelum LIMIT/OFFSET
        $countParams = $params;
        $countTypes = $types;

        // Tambahkan LIMIT/OFFSET untuk query utama
        $params[] = $perPage;
        $params[] = $offset;
        $types .= "ii";

        $stmt->bind_param($types, ...$params);
        
        if (!$stmt->execute()) {
            throw new \Exception("Query execution failed: " . $stmt->error);
        }

        $result = $stmt->get_result();
        $orders = [];
        while ($row = $result->fetch_assoc()) {
            $orders[] = $row;
        }

        // Get total count for pagination
        $countSql = "SELECT COUNT(DISTINCT o.order_id) as total 
                     FROM {$this->table} o
                     INNER JOIN users u ON o.buyer_id = u.user_id
                     WHERE {$whereClause}";

        $stmt = $this->conn->prepare($countSql);
        if (!$stmt) {
            throw new \Exception("Count query preparation failed: " . $this->conn->error);
        }
        $stmt->bind_param($countTypes, ...$countParams);
        if (!$stmt->execute()) {
            throw new \Exception("Count query execution failed: " . $stmt->error);
        }
        $totalResult = $stmt->get_result()->fetch_assoc();
        $total = $totalResult['total'];

        return [
            'orders' => $orders,
            'total' => $total,
            'total_pages' => ceil($total / $perPage)
        ];
    }

    public function getOrderDetails($orderId, $storeId) {
        $sql = "SELECT o.*, u.name as buyer_name, u.email as buyer_email,
                GROUP_CONCAT(CONCAT(p.product_name, ':', oi.quantity, ':', oi.price_at_order, ':', oi.subtotal) SEPARATOR '|') as items
                FROM {$this->table} o
                INNER JOIN users u ON o.buyer_id = u.user_id
                INNER JOIN {$this->itemsTable} oi ON o.order_id = oi.order_id
                INNER JOIN products p ON oi.product_id = p.product_id
                WHERE o.order_id = ? AND o.store_id = ?
                GROUP BY o.order_id";

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new \Exception("Query preparation failed: " . $this->conn->error);
        }

        $stmt->bind_param("ii", $orderId, $storeId);
        
        if (!$stmt->execute()) {
            throw new \Exception("Query execution failed: " . $stmt->error);
        }

        $result = $stmt->get_result();
        $order = $result->fetch_assoc();

        if ($order) {
            // Parse items string into array
            $items = [];
            foreach (explode('|', $order['items']) as $item) {
                list($name, $quantity, $price, $subtotal) = explode(':', $item);
                $items[] = [
                    'product_name' => $name,
                    'quantity' => $quantity,
                    'price' => $price,
                    'subtotal' => $subtotal
                ];
            }
            $order['items'] = $items;
        }

        return $order;
    }

    public function updateOrderStatus($orderId, $storeId, $status, $data = []) {
        $this->conn->begin_transaction();

        try {
            // First check if order exists and belongs to store
            $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE order_id = ? AND store_id = ? FOR UPDATE");
            $stmt->bind_param("ii", $orderId, $storeId);
            $stmt->execute();
            $order = $stmt->get_result()->fetch_assoc();

            if (!$order) {
                throw new \Exception("Order not found or unauthorized");
            }

            $updates = ["status = ?"];
            $params = [$status];
            $types = "s";

            if ($status === 'rejected') {
                if (empty($data['reject_reason'])) {
                    throw new \Exception("Reject reason is required");
                }
                $updates[] = "reject_reason = ?";
                $params[] = $data['reject_reason'];
                $types .= "s";

                // Process refund
                $stmt = $this->conn->prepare("UPDATE users SET balance = balance + ? WHERE user_id = ?");
                $stmt->bind_param("ii", $order['total_price'], $order['buyer_id']);
                if (!$stmt->execute()) {
                    throw new \Exception("Failed to process refund");
                }
            } else if ($status === 'on_delivery') {
                if (empty($data['delivery_time'])) {
                    throw new \Exception("Delivery time is required");
                }
                $updates[] = "delivery_time = ?";
                $params[] = $data['delivery_time'];
                $types .= "s";
            } else if ($status === 'approved') {
                $updates[] = "confirmed_at = CURRENT_TIMESTAMP";
            }

            $updateFields = implode(", ", $updates);
            $sql = "UPDATE {$this->table} SET {$updateFields} WHERE order_id = ? AND store_id = ?";
            
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new \Exception("Query preparation failed: " . $this->conn->error);
            }

            $params[] = $orderId;
            $params[] = $storeId;
            $types .= "ii";

            $stmt->bind_param($types, ...$params);
            
            if (!$stmt->execute()) {
                throw new \Exception("Failed to update order status");
            }

            $this->conn->commit();
            return true;

        } catch (\Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
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
                o.delivery_time, 
                s.store_name
            FROM orders o
            JOIN stores s ON o.store_id = s.store_id
            WHERE o.buyer_id = ?
        ";

        if ($filterStatus !== 'all' && $filterStatus !== '') {
            $sql .= " AND o.status = ?";
        }

        $sql .= " ORDER BY o.created_at DESC";

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

        // Query kedua untuk mengambil semua item (tidak perlu diubah)
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
