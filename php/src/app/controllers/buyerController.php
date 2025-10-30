<?php
namespace App\Controllers;

require_once(__DIR__ . '/../models/product.php');
require_once(__DIR__ . '/../models/user.php');
require_once(__DIR__ . '/../utils/imageHandler.php');

use App\Models\Product;
use App\Models\User;
use App\Utils\ImageHandler;

class BuyerController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getDashboardData($buyerId, $filters = [], $page = 1, $perPage = 12) {
        $productModel = new Product($this->conn);
        $userModel = new User($this->conn);

        $data = $productModel->getFilteredProducts($filters, $page, $perPage);
        $rawProducts = $data['products'] ?? [];
        $products = [];

        if ($rawProducts instanceof \mysqli_result) {
            while ($row = $rawProducts->fetch_assoc()) {
                $row['main_image_path'] = ImageHandler::ensureImagePath(
                    $row['main_image_path'] ?? '',
                    '/assets/images/default.png'
                );
                $products[] = $row;
            }
        } elseif (is_array($rawProducts)) {
            foreach ($rawProducts as $p) {
                $p['main_image_path'] = ImageHandler::ensureImagePath(
                    $p['main_image_path'] ?? '',
                    '/assets/images/default.png'
                );
                $products[] = $p;
            }
        }

        return [
            'user'       => $buyerId ? $userModel->findById($buyerId) : null,
            'products'   => $products,
            'totalPages' => $data['totalPages'] ?? 1,
            'categories' => $productModel->getAllCategories()
        ];
    }
}
