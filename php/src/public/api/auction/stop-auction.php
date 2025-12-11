<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/models/feature.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

use App\Models\Feature;

ensureJsonResponse();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized: only sellers can stop auctions", 401);
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

// Ambil auction_id dari JSON
$input = json_decode(file_get_contents("php://input"), true);
$auction_id = $input['auction_id'] ?? null;

if (!$auction_id) return sendError("Missing auction_id", 400);

// Mulai transaction supaya aman
$conn->begin_transaction();

try {
    // Update status auction
    $stmt = $conn->prepare("UPDATE auctions SET status = 'ended', end_time = NOW() WHERE auction_id = ?");
    $stmt->bind_param("i", $auction_id);
    if (!$stmt->execute()) throw new Exception("Failed to stop auction");

    // Ambil highest bid untuk auction
    $stmtBid = $conn->prepare("
        SELECT bidder_id, bid_amount 
        FROM auction_bids 
        WHERE auction_id = ? 
        ORDER BY bid_amount DESC, bid_time ASC
        LIMIT 1
    ");
    $stmtBid->bind_param("i", $auction_id);
    $stmtBid->execute();
    $highest_bid = $stmtBid->get_result()->fetch_assoc();

    $order_id = null;

    if ($highest_bid) {
        $winner_id = $highest_bid['bidder_id'];
        $amount = $highest_bid['bid_amount'];

        $stmtStore = $conn->prepare("
            SELECT store_id 
            FROM products 
            WHERE product_id = (
                SELECT product_id 
                FROM auctions 
                WHERE auction_id = ?
            )
        ");
        $stmtStore->bind_param("i", $auction_id);
        $stmtStore->execute();
        $storeData = $stmtStore->get_result()->fetch_assoc();
        $store_id = $storeData['store_id'];

        // Ambil address buyer dari users
        $stmtAddress = $conn->prepare("SELECT address FROM users WHERE user_id = ?");
        $stmtAddress->bind_param("i", $winner_id);
        $stmtAddress->execute();
        $userData = $stmtAddress->get_result()->fetch_assoc();
        $shipping_address = $userData['address'] ?? '';


        // Insert order
        $stmtOrder = $conn->prepare("
            INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status)
            VALUES (?, ?, ?, ?, 'approved')
        ");
        $stmtOrder->bind_param("iiis", $winner_id, $store_id, $amount, $shipping_address);
        $stmtOrder->execute();
        $order_id = $stmtOrder->insert_id;

        // Update auction dengan winner_id
        $stmtUpdate = $conn->prepare("
            UPDATE auctions 
            SET winner_id = ?
            WHERE auction_id = ?
        ");
        $stmtUpdate->bind_param("ii", $winner_id, $auction_id);
        $stmtUpdate->execute();
    }

    // Commit transaction
    $conn->commit();

} catch (Exception $e) {
    $conn->rollback();
    return sendError($e->getMessage(), 500);
}

// --- Notify Node.js WebSocket ---
$payload = [
    'type' => 'auction_stopped',
    'auction_id' => $auction_id,
    'order_id' => $order_id,
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
$context  = stream_context_create($options);
@file_get_contents($ws_url, false, $context);

sendSuccess(["message" => "Auction stopped successfully", "order_id" => $order_id]);
?>
