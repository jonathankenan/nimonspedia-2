<?php
include_once(__DIR__ . '/../models/product.php');
include_once(__DIR__ . '/../models/user.php');

class BuyerController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getDashboardData($buyerId) {
        $productModel = new Product($this->conn);
        $userModel = new User($this->conn);

        $products = $productModel->getAll();
        $user = $userModel->findById($buyerId);

        return [
            'user' => $user,
            'products' => $products
        ];
    }
}
?>
