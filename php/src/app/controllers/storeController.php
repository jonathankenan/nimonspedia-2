<?php
namespace App\Controllers;

require_once(__DIR__ . '/../models/store.php');
require_once(__DIR__ . '/../models/product.php');
require_once(__DIR__ . '/../models/order.php');

use App\Models\Store;
use App\Models\Product;
use App\Models\Order;

class StoreController {
    private $conn;
    private $storeModel;
    private $productModel;
    private $orderModel;

    public function __construct($conn) {
        $this->conn = $conn;
        $this->storeModel = new Store($conn);
        $this->productModel = new Product($conn);
        $this->orderModel = new Order($conn);
    }

    public function getStoreStatistics($storeId) {
        try {
            // Get total products
            $totalProducts = $this->productModel->countByStoreId($storeId);
            
            // Get low stock products (less than or equal to 5)
            $lowStockProducts = $this->productModel->countLowStockByStoreId($storeId, 5);
            
            // Get pending orders
            $pendingOrders = $this->orderModel->countPendingByStoreId($storeId);
            
            // Get total revenue (from completed orders)
            $totalRevenue = $this->orderModel->calculateTotalRevenueByStoreId($storeId);
            
            return [
                'success' => true,
                'data' => [
                    'totalProducts' => $totalProducts,
                    'lowStockProducts' => $lowStockProducts,
                    'pendingOrders' => $pendingOrders,
                    'totalRevenue' => $totalRevenue
                ]
            ];
        } catch (\Exception $e) {
            error_log("StoreController Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch store statistics: ' . $e->getMessage()
            ];
        }
    }
}