<?php
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';
require_once __DIR__ . '/../../../app/utils/session.php';

ensureJsonResponse();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized", 401);
}

$user_id = $_SESSION['user_id'];

// Get Store ID
$stmt = $conn->prepare("SELECT store_id, store_name FROM stores WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$store = $stmt->get_result()->fetch_assoc();

if (!$store) {
    return sendError("Store not found", 404);
}

$store_id = $store['store_id'];
$store_name = $store['store_name'];

// Get all auctions for this store
$stmt = $conn->prepare("
    SELECT 
        a.auction_id,
        a.status,
        a.start_time,
        a.end_time,
        a.starting_price,
        a.current_price,
        a.quantity,
        a.winner_id,
        p.product_id,
        p.product_name,
        p.main_image_path,
        COUNT(b.bid_id) AS bid_count
    FROM auctions a
    JOIN products p ON a.product_id = p.product_id
    LEFT JOIN auction_bids b ON a.auction_id = b.auction_id
    WHERE p.store_id = ?
    GROUP BY a.auction_id
    ORDER BY a.start_time DESC
");
$stmt->bind_param("i", $store_id);
$stmt->execute();
$result = $stmt->get_result();

$base_url = 'localhost:8080';
$auctions = [];
while ($row = $result->fetch_assoc()) {
    $auctions[] = [
        'auction_id' => (int)$row['auction_id'],
        'product_id' => (int)$row['product_id'],
        'product_name' => $row['product_name'],
        'image_url'    => $base_url . $row['main_image_path'],
        'quantity' => (int)$row['quantity'],
        'starting_price' => (int)$row['starting_price'],
        'current_price' => (int)$row['current_price'],
        'status' => $row['status'],
        'start_time' => $row['start_time'],
        'end_time' => $row['end_time'],
        'winner_id' => $row['winner_id'] ? (int)$row['winner_id'] : null,
        'store_name' => $store_name,
        'bid_count' => (int)$row['bid_count'] 
    ];
}

return sendSuccess($auctions);
