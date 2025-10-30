<?php
require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/controllers/storeController.php');

use App\Controllers\StoreController;

requireRole('SELLER');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $storeId = $_SESSION['store_id'] ?? null;
    if (!$storeId) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Store ID not found in session',
            'debug' => [
                'session' => $_SESSION,
                'store_id' => $storeId
            ]
        ]);
        exit;
    }

    $controller = new StoreController($conn);
    $stats = $controller->getStoreStatistics($storeId);
    
    // Add debug info
    if (!$stats['success']) {
        $stats['debug'] = [
            'session' => $_SESSION,
            'store_id' => $storeId
        ];
    }
    
    header('Content-Type: application/json');
    echo json_encode($stats);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
    exit;
}