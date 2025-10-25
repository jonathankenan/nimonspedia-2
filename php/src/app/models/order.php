<?php
namespace App\Models;

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
}
