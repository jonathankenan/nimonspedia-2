<?php
// Prevent any output before JSON
ob_start();

require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

// Clear any output and set JSON header
ob_clean();
header('Content-Type: application/json');

// Check if user is logged in
if (!isLoggedIn() || $_SESSION['role'] !== 'BUYER') {
    jsonResponse(['message' => 'Unauthorized'], 401);
}

// Get store_id from query parameter
$storeId = isset($_GET['store_id']) ? intval($_GET['store_id']) : null;

if (!$storeId) {
    jsonResponse(['message' => 'Store ID is required'], 400);
}

try {
    // Get products from the specified store using mysqli
    $query = "
        SELECT 
            p.product_id,
            p.product_name,
            p.price,
            p.stock,
            p.main_image_path as image_path
        FROM products p
        WHERE p.store_id = ?
        AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $storeId);
    $stmt->execute();
    $result = $stmt->get_result();
    $products = $result->fetch_all(MYSQLI_ASSOC);
    
    // Convert numeric fields to proper types
    foreach ($products as &$product) {
        $product['product_id'] = (int)$product['product_id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
    }
    
    jsonResponse(['products' => $products]);
    
} catch (Exception $e) {
    error_log('Get store products error: ' . $e->getMessage());
    jsonResponse(['message' => 'Failed to load products'], 500);
}
