<?php
namespace App\Models;

class CategoryItem {
    private $conn;
    private $table = "category_items";

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function linkProduct($categoryId, $productId) {
        $stmt = $this->conn->prepare("INSERT INTO {$this->table} (category_id, product_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $categoryId, $productId);
        return $stmt->execute();
    }

    public function getProductsByCategory($categoryId) {
        $stmt = $this->conn->prepare("
            SELECT p.*
            FROM {$this->table} ci
            JOIN products p ON ci.product_id = p.product_id
            WHERE ci.category_id = ?");
        $stmt->bind_param("i", $categoryId);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
