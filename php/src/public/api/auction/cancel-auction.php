<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/models/feature.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

use App\Models\Feature;

ensureJsonResponse();

// AUTH: Only sellers
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized: only sellers can cancel auctions", 401);
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

$input = json_decode(file_get_contents("php://input"), true);
$auction_id = $input['auction_id'] ?? null;

if (!$auction_id) return sendError("Missing auction_id", 400);

// Check if auction already has bids
$check = $conn->prepare("SELECT COUNT(*) AS bid_count FROM auction_bids WHERE auction_id = ?");
$check->bind_param("i", $auction_id);
$check->execute();
$bidCount = $check->get_result()->fetch_assoc()['bid_count'];

if ($bidCount > 0) {
    return sendError("Auction already has bids, cannot cancel", 400);
}

// Cancel auction
$stmt = $conn->prepare("
    UPDATE auctions 
    SET status = 'cancelled', end_time = NOW()
    WHERE auction_id = ?
");
$stmt->bind_param("i", $auction_id);

if ($stmt->execute()) {

    // =============================
    // ROLLBACK QUANTITY PRODUK
    // =============================
    $stmtInfo = $conn->prepare("SELECT product_id, quantity FROM auctions WHERE auction_id = ?");
    $stmtInfo->bind_param("i", $auction_id);
    $stmtInfo->execute();
    $auctionInfo = $stmtInfo->get_result()->fetch_assoc();

    if ($auctionInfo) {
        $product_id = $auctionInfo['product_id'];
        $quantity = $auctionInfo['quantity'];

        $stmtQty = $conn->prepare("UPDATE products SET stock = stock + ? WHERE product_id = ?");
        $stmtQty->bind_param("ii", $quantity, $product_id);
        $stmtQty->execute();
    }

    // Notify WS
    $payload = [
        'type' => 'auction_cancelled',
        'auction_id' => $auction_id,
        'timestamp' => date('c')
    ];

    $ws_url = "http://node:3003/notify_bid";
    $options = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n",
            'content' => json_encode($payload),
            'timeout' => 1
        ]
    ];
    $context = stream_context_create($options);
    @file_get_contents($ws_url, false, $context);

    sendSuccess(["message" => "Auction cancelled successfully"]);
} else {
    sendError("Failed to cancel auction", 500);
}
