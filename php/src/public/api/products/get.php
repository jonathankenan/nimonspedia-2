<?php
require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/models/product.php');

use App\Models\Product;

header('Content-Type: application/json');

// Get product ID from query parameter
$productId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($productId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid product ID']);
    exit;
}

try {
    $productModel = new Product($conn);
    $product = $productModel->findProductWithStoreById($productId);
    
    if (!$product) {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
        exit;
    }
    
    // Return product data
    echo json_encode($product);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
