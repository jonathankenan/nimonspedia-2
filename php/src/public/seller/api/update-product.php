<?php
// Prevent any output before headers
ob_start();

require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/models/product.php');
require_once(__DIR__ . '/../../../app/utils/json_response.php');

use App\Models\Product;

// Set JSON headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// Ensure all output is JSON
ensureJsonResponse();

try {
    // Check if user is logged in and is a seller
    requireRole('SELLER');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['message' => 'Method not allowed'], 405);
}

$productId = $_POST['productId'] ?? 0;
if (!$productId) {
    jsonResponse(['message' => 'Product ID is required'], 400);
}

// Basic validation
$requiredFields = ['productName', 'productDescription', 'productPrice', 'productStock'];
foreach ($requiredFields as $field) {
    if (!isset($_POST[$field])) {
        jsonResponse(['message' => "Missing required field: $field"], 400);
    }
}

// Handle image upload if provided
$imagePath = null;
if (isset($_FILES['productImage']) && $_FILES['productImage']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../../public/assets/images/products/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileExtension = strtolower(pathinfo($_FILES['productImage']['name'], PATHINFO_EXTENSION));
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        jsonResponse(['message' => 'Invalid file type. Allowed: JPG, JPEG, PNG, GIF'], 400);
    }

    $fileName = uniqid() . '.' . $fileExtension;
    $filePath = $uploadDir . $fileName;

    if (!move_uploaded_file($_FILES['productImage']['tmp_name'], $filePath)) {
        jsonResponse(['message' => 'Failed to upload image'], 500);
    }

    $imagePath = '/assets/images/products/' . $fileName;
}

    // Update product in database
    $product = new Product($conn);
    
    $updateData = [
        'name' => $_POST['productName'],
        'description' => $_POST['productDescription'],
        'price' => (float)$_POST['productPrice'],
        'stock' => (int)$_POST['productStock']
    ];

    if ($imagePath !== null) {
        $updateData['image_url'] = $imagePath;
    }

    if ($product->update($productId, $updateData)) {
        jsonResponse(['message' => 'Product updated successfully']);
    } else {
        jsonResponse(['message' => 'Failed to update product'], 500);
    }
} catch (\Exception $e) {
    jsonResponse(['message' => $e->getMessage()], 500);
}