<?php
require_once(__DIR__ . '/../../../app/utils/json_response.php');
require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/controllers/productController.php');

use App\Controllers\ProductController;

ensureJsonResponse();

requireRole('SELLER');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    // Initialize controller
    $productController = new ProductController($conn);
    
    // Process the update
    $result = $productController->update($_POST, $_FILES['productImage'] ?? null);
    
    if ($result['success']) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully',
            'data' => $result['data']
        ]);
    } else {
        throw new Exception($result['message']);
    }
} catch (Exception $e) {
    error_log("Error updating product: " . $e->getMessage());
    http_response_code($e->getCode() >= 400 ? $e->getCode() : 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}