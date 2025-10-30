<?php
namespace App\Controllers;

require_once(__DIR__ . '/../models/product.php');
require_once(__DIR__ . '/../models/user.php');

use App\Models\Product;
use App\Models\User;

class BuyerController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getDashboardData($buyerId, $filters = [], $page = 1, $perPage = 12) {
        $productModel = new Product($this->conn);
        $userModel = new User($this->conn);

        // Ambil data produk dalam bentuk array
        $data = $productModel->getFilteredProducts($filters, $page, $perPage);
        $products = $data['products'];

        foreach ($products as $p) {
            $imgPath = $_SERVER['DOCUMENT_ROOT'] . $p['main_image_path'];
            if (empty($p['main_image_path']) || !file_exists($imgPath)) {
                $p['main_image_path'] = '/assets/images/default.png';
            }
            $finalProducts[] = $p;
        }
        $products = $finalProducts ?? [];

        return [
            'user'       => $buyerId ? $userModel->findById($buyerId) : null,
            'products'   => $products,
            'totalPages' => $data['totalPages'],
            'categories' => $productModel->getAllCategories()
        ];
    }
}
