<?php
namespace App\Controllers;

require_once(__DIR__ . '/../models/store.php');
require_once(__DIR__ . '/../models/product.php');
require_once(__DIR__ . '/../models/order.php');
require_once(__DIR__ . '/../utils/imageHandler.php');

use App\Models\Store;
use App\Models\Product;
use App\Models\Order;
use App\Utils\ImageHandler;

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

    public function getStoreById(int $storeId) {
        $storeId = (int)$storeId;
        $res = $this->conn->query("SELECT * FROM stores WHERE store_id = $storeId");
        return $res ? $res->fetch_assoc() : null;
    }


    public function getStoreProducts(int $storeId, array $filters = [], int $page = 1, int $perPage = 10): array {
        $filters['store_id'] = $storeId;
        $productModel = new Product($this->conn);
        $data = $productModel->getFilteredProducts($filters, $page, $perPage);

        $final = [];
        foreach ($data['products'] as $p) {
            $p['main_image_path'] = ImageHandler::ensureImagePath($p['main_image_path'], '/assets/images/default.png');
            $final[] = $p;
        }

        return [
            'products' => $final,
            'totalPages' => $data['totalPages']
        ];
    }

    public function getStoreStatistics($storeId) {
        try {
            $totalProducts = $this->productModel->countByStoreId($storeId);
            $lowStockProducts = $this->productModel->countLowStockByStoreId($storeId, 5);
            $pendingOrders = $this->orderModel->countPendingByStoreId($storeId);
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
