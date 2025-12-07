<?php
require_once __DIR__ . '/../controllers/featureFlagController.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route: GET /api/features/check
if ($method === 'GET' && preg_match('#^/api/features/check$#', $path)) {
    checkFeature();
    exit;
}

// Route: GET /api/features/all
if ($method === 'GET' && preg_match('#^/api/features/all$#', $path)) {
    getAllFeatures();
    exit;
}

// 404 Not Found
http_response_code(404);
echo json_encode(['error' => 'Endpoint not found']);
