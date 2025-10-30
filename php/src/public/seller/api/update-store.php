<?php
require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/models/store.php');

use App\Models\Store;

header('Content-Type: application/json');
requireRole('SELLER');

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]));
}

// Get store ID from session
$storeId = $_SESSION['store_id'] ?? null;
if (!$storeId) {
    http_response_code(400);
    die(json_encode([
        'success' => false,
        'message' => 'Store ID not found in session'
    ]));
}

// Initialize update data array
$updateData = [];

// Get and validate input
$storeName = $_POST['storeName'] ?? '';
$storeDescription = $_POST['storeDescription'] ?? '';

if (empty($storeName)) {
    http_response_code(400);
    die(json_encode([
        'success' => false,
        'message' => 'Store name is required'
    ]));
}

$updateData['store_name'] = $storeName;
$updateData['store_description'] = $storeDescription;

// Handle logo upload if file is provided
if (isset($_FILES['storeLogo']) && $_FILES['storeLogo']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['storeLogo'];
    $allowedTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];
    
    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        die(json_encode([
            'success' => false,
            'message' => 'Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.'
        ]));
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('store_') . '.' . $extension;
    $uploadDir = __DIR__ . '/../../assets/images/store-logos/';
    
    // Create directory if it doesn't exist
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            http_response_code(500);
            die(json_encode([
                'success' => false,
                'message' => 'Failed to create upload directory'
            ]));
        }
    }
    
    // Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        $updateData['store_logo_path'] = '/assets/images/store-logos/' . $filename;
        
    // Get current store info to delete old logo
        $storeModel = new Store($conn);
        $store = $storeModel->getById($storeId); // Gunakan store_id dari session
        
        // Delete old logo if it exists and is not the default
        if ($store['store_logo_path'] && 
            $store['store_logo_path'] !== '/assets/images/default-store.png' &&
            file_exists(__DIR__ . '/..' . $store['store_logo_path'])) {
            unlink(__DIR__ . '/..' . $store['store_logo_path']);
        }
    } else {
        http_response_code(500);
        die(json_encode([
            'success' => false,
            'message' => 'Failed to upload store logo'
        ]));
    }
}

// Update store information
$storeModel = new Store($conn);
try {
    $success = $storeModel->update($storeId, $updateData);
    if ($success) {
        echo json_encode([
            'success' => true,
            'message' => 'Store information updated successfully',
            'data' => $updateData
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update store information'
        ]);
    }
} catch (Exception $e) {
    error_log("Error updating store: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while updating store information'
    ]);
}