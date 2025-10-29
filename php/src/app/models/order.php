<?php
namespace App\Models;

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
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
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
}