<?php
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/models/feature.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';
require_once __DIR__ . '/../../../app/utils/session.php';

use App\Models\Feature;

// session_start(); // Handled by session.php
ensureJsonResponse();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized", 401);
}

// Check auction feature flag
$featureModel = new Feature($conn);
$auction_access = $featureModel->checkAccess($_SESSION['user_id'], 'auction_enabled');
if (!$auction_access['allowed']) {
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => false,
        'feature_disabled' => true,
        'message' => $auction_access['reason'] ?? 'Fitur lelang dinonaktifkan'
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get Store ID
$stmt = $conn->prepare("SELECT store_id FROM stores WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$store = $stmt->get_result()->fetch_assoc();

if (!$store) {
    return sendError("Store not found", 404);
}

$store_id = $store['store_id'];

// Get Active or Scheduled Auction for this store
// Assuming one active auction per seller rule
$stmt = $conn->prepare("
    SELECT a.auction_id 
    FROM auctions a
    JOIN products p ON a.product_id = p.product_id
    WHERE p.store_id = ? 
    AND a.status IN ('active', 'scheduled')
    LIMIT 1
");
$stmt->bind_param("i", $store_id);
$stmt->execute();
$result = $stmt->get_result();
$auction = $result->fetch_assoc();

if ($auction) {
    return sendSuccess(['auction_id' => $auction['auction_id']]);
} else {
    return sendSuccess(['auction_id' => null]);
}
