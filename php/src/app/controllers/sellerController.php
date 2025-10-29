<?php
namespace App\Controllers;

class SellerController {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getStoreStats($storeId) {
        // Get unique products count
        $productsQuery = "SELECT COUNT(DISTINCT product_id) as total_products 
                         FROM products 
                         WHERE store_id = ? AND deleted_at IS NULL";
        
        // Get low stock products
        $lowStockQuery = "SELECT COUNT(*) as low_stock 
                         FROM products 
                         WHERE store_id = ? AND stock < 10 AND deleted_at IS NULL";
        
        // Get pending orders
        $pendingOrdersQuery = "SELECT COUNT(*) as pending_orders 
                             FROM orders 
                             WHERE store_id = ? AND status = 'waiting_approval'";
        
        // Get total revenue
        $revenueQuery = "SELECT SUM(total_price) as total_revenue 
                        FROM orders 
                        WHERE store_id = ? AND status IN ('approved', 'on_delivery', 'received')";

        $stmt = $this->conn->prepare($productsQuery);
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        $products = $stmt->get_result()->fetch_assoc();

        $stmt = $this->conn->prepare($lowStockQuery);
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        $lowStock = $stmt->get_result()->fetch_assoc();

        $stmt = $this->conn->prepare($pendingOrdersQuery);
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        $pending = $stmt->get_result()->fetch_assoc();

        $stmt = $this->conn->prepare($revenueQuery);
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        $revenue = $stmt->get_result()->fetch_assoc();

        return [
            'total_products' => $products['total_products'] ?? 0,
            'low_stock' => $lowStock['low_stock'] ?? 0,
            'pending_orders' => $pending['pending_orders'] ?? 0,
            'total_revenue' => $revenue['total_revenue'] ?? 0
        ];
    }

    public function updateStoreInfo($storeId, $data) {
        $query = "UPDATE stores 
                 SET store_name = ?, store_description = ? 
                 WHERE store_id = ?";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ssi", $data['store_name'], $data['store_description'], $storeId);
        
        if ($stmt->execute()) {
            return ['success' => true];
        }
        return ['success' => false, 'error' => $stmt->error];
    }
}