<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

session_start();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized", 401);
}

$user_id = $_SESSION['user_id'];

try {
    $db = getDatabaseConnection();
    
    // Get all products for this seller
    $stmt = $db->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.description,
            p.price,
            p.stock,
            p.main_image_path,
            s.store_id,
            s.store_name
        FROM products p
        JOIN stores s ON p.store_id = s.store_id
        WHERE s.user_id = ?
        ORDER BY p.product_name ASC
    ");
    
    $stmt->execute([$user_id]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert numeric fields to proper types
    foreach ($products as &$product) {
        $product['product_id'] = (int)$product['product_id'];
        $product['store_id'] = (int)$product['store_id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
    }
    
    return sendSuccess($products);
    
} catch (Exception $e) {
    error_log("Error fetching seller products: " . $e->getMessage());
    return sendError("Failed to fetch products", 500);
}
