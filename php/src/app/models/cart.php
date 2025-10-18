<?php
class Cart {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function addItem($buyerId, $productId, $quantity) {
        $stmt = $this->conn->prepare("
            INSERT INTO cart_item (buyer_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        ");
        $stmt->bind_param("iii", $buyerId, $productId, $quantity);
        return $stmt->execute();
    }
}
?>
