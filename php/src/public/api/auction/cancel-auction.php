<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

ensureJsonResponse();

// AUTH: Only sellers
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized: only sellers can cancel auctions", 401);
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
?>
