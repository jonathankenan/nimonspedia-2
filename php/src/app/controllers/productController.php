<?php
namespace App\Controllers;

use App\Models\Product;

class ProductController {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getDetailData(int $productId): array {
        $productModel = new Product($this->conn);
        $product = $productModel->findProductWithStoreById($productId);
        if (!$product) {
            return [];
        }
        $categories = $productModel->getCategoriesForProduct($productId);
        return [
            'product' => $product,
            'categories' => $categories,
        ];
    }
}


