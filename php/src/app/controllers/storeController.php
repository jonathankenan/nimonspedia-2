<?php
namespace App\Controllers;

use App\Models\Product;

class StoreController {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getStoreById(int $storeId) {
        $storeId = (int)$storeId;
        $res = $this->conn->query("SELECT * FROM stores WHERE store_id = $storeId");
        return $res ? $res->fetch_assoc() : null;
    }

    public function getStoreProducts(int $storeId, array $filters = [], int $page = 1, int $perPage = 12): array {
        $filters['store_id'] = $storeId;
        $productModel = new Product($this->conn);
        return $productModel->getFilteredProducts($filters, $page, $perPage);
    }
}


