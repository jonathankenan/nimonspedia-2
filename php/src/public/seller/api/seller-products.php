<?php
require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/models/product.php');

header('Content-Type: application/json');

// Cek session
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'SELLER') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    // Ambil store_id dari user_id
    $stmt = $conn->prepare("SELECT store_id FROM stores WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $store = $result->fetch_assoc();

    if (!$store) {
        throw new Exception("Store not found");
    }

    $store_id = $store['store_id'];

    // Ambil semua produk dari store ini, atau satu jika ada parameter id
    $product_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($product_id) {
        $query = "SELECT product_id, product_name, stock, price, main_image_path 
                  FROM products 
                  WHERE store_id = ? AND product_id = ? AND deleted_at IS NULL";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $store_id, $product_id);
    } else {
        $query = "SELECT product_id, product_name, stock, price, main_image_path 
                  FROM products 
                  WHERE store_id = ? AND deleted_at IS NULL 
                  ORDER BY created_at DESC";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $store_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }

    echo json_encode(['data' => $products]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
