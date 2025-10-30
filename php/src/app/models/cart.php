<?php
namespace App\Models;
use mysqli;

class Cart {
    private mysqli $conn;
    private string $table = "cart_items";

    public function __construct(mysqli $db) {
        $this->conn = $db;
    }

    public function addItem(int $buyerId, int $productId, int $quantity): bool {
        $stmt = $this->conn->prepare("SELECT cart_item_id FROM {$this->table} WHERE buyer_id = ? AND product_id = ?");
        $stmt->bind_param("ii", $buyerId, $productId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $cartItemId = $row['cart_item_id'];
            $updateStmt = $this->conn->prepare("UPDATE {$this->table} SET quantity = quantity + ? WHERE cart_item_id = ?");
            $updateStmt->bind_param("ii", $quantity, $cartItemId);
            return $updateStmt->execute();
        } else {
            $insertStmt = $this->conn->prepare("INSERT INTO {$this->table} (buyer_id, product_id, quantity) VALUES (?, ?, ?)");
            $insertStmt->bind_param("iii", $buyerId, $productId, $quantity);
            return $insertStmt->execute();
        }
    }

    public function getCartItems(int $buyerId) {
        $query = "
            SELECT 
                ci.cart_item_id, 
                ci.quantity,
                p.product_id, 
                p.product_name, 
                p.price, 
                p.main_image_path, 
                p.stock,
                s.store_id, 
                s.store_name
            FROM {$this->table} ci
            JOIN products p ON ci.product_id = p.product_id
            JOIN stores s ON p.store_id = s.store_id
            WHERE ci.buyer_id = ? AND p.deleted_at IS NULL
            ORDER BY s.store_name, p.product_name;
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $buyerId);
        $stmt->execute();
        return $stmt->get_result();
    }

    public function updateItemQuantity(int $cartItemId, int $quantity): bool {
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET quantity = ? WHERE cart_item_id = ?");
        $stmt->bind_param("ii", $quantity, $cartItemId);
        return $stmt->execute();
    }

    public function removeItem(int $cartItemId): bool {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE cart_item_id = ?");
        $stmt->bind_param("i", $cartItemId);
        return $stmt->execute();
    }
    
    public function getCartItemCount(int $buyerId): int {
        $stmt = $this->conn->prepare("SELECT COUNT(cart_item_id) as count FROM {$this->table} WHERE buyer_id = ?");
        $stmt->bind_param("i", $buyerId);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        return $result['count'] ?? 0;
    }
}
?>