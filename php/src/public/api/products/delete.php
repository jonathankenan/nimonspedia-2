<?php
ob_start();

require_once __DIR__ . '/../../../app/utils/json_response.php';

ensureJsonResponse();

require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/models/product.php';
require_once __DIR__ . '/../../../app/config/db.php';

use App\Models\Product;

// Check authentication first
if (!isLoggedIn()) {
    jsonResponse([
        'success' => false,
        'message' => 'Authentication required'
    ], 401);
}

// Check role
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'SELLER') {
    jsonResponse([
        'success' => false,
        'message' => 'Unauthorized: Seller role required'
    ], 403);
}

// For SELLER role, ensure they have a store
if (!isset($_SESSION['store_id'])) {
    jsonResponse([
        'success' => false,
        'message' => 'Unauthorized: Store not found'
    ], 403);
}

try {
    // Check if it's a DELETE request
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        jsonResponse([
            'success' => false,
            'message' => 'Method not allowed'
        ], 405);
    }

    // Get product ID from query params
    $productId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$productId) {
        jsonResponse([
            'success' => false,
            'message' => 'Product ID is required'
        ], 400);
    }

    $product = new Product($conn);
    
    // Get the product details first to check ownership
    $productDetails = $product->getProductById($productId);
    if ($productDetails === null) {
        jsonResponse([
            'success' => false,
            'message' => 'Product not found'
        ], 404);
    }
    
    // Check if the logged-in seller owns this product
    if ($productDetails['store_id'] !== $_SESSION['store_id']) {
        jsonResponse([
            'success' => false,
            'message' => 'Unauthorized to delete this product'
        ], 403);
    }

    // Delete the product
    if ($product->deleteProduct($productId)) {
        jsonResponse([
            'success' => true,
            'message' => 'Product deleted successfully'
        ], 200);
    } else {
        jsonResponse([
            'success' => false,
            'message' => 'Failed to delete product'
        ], 500);
    }
} catch (\Exception $e) {
    error_log("Error deleting product: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Server error occurred while deleting product'
    ], 500);
}