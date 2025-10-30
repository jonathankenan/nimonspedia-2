<?php
require_once(__DIR__ . '/../../../app/utils/json_response.php');
require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/models/product.php');
require_once(__DIR__ . '/../../../app/models/categoryItem.php');
require_once(__DIR__ . '/../../../app/controllers/productController.php');

use App\Controllers\ProductController;
use App\Models\Product;
use App\Models\CategoryItem;

// Ensure all responses are JSON
ensureJsonResponse();

header('Content-Type: application/json');

// Check if user is logged in and is a seller
requireRole('SELLER');

try {
    // Debug: Log request details
    error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
    error_log("Content type: " . (isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'not set'));
    error_log("POST data: " . print_r($_POST, true));
    error_log("FILES data: " . print_r($_FILES, true));

    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    // Decode JSON if content type is application/json
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON format: ' . json_last_error_msg(), 400);
        }
        $_POST = array_merge($_POST, $input);
    }

    try {
        // Initialize controller
        $productController = new ProductController($conn);
        
        // Debug: Log request data
        error_log("POST data: " . json_encode($_POST));
        error_log("FILES data: " . json_encode($_FILES));
        
        // Process the request
        $result = $productController->create($_POST, $_FILES['productImage']);
        
        if ($result['success']) {
            http_response_code(201);
            echo json_encode([
                'status' => 'success',
                'message' => $result['message'],
                'data' => $result['data']
            ]);
        } else {
            throw new Exception($result['message'], 400);
        }
    } catch (Throwable $e) {
        error_log("Error in create.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        http_response_code($e->getCode() >= 400 ? $e->getCode() : 500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
    }
} catch (Throwable $e) {
    error_log("Fatal error in create.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Internal Server Error: ' . $e->getMessage()
    ]);
}