<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

ensureJsonResponse();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized: only sellers can stop auctions", 401);
}

// Ambil auction_id dari JSON
$input = json_decode(file_get_contents("php://input"), true);
$auction_id = $input['auction_id'] ?? null;

if (!$auction_id) return sendError("Missing auction_id", 400);

// Update status
$stmt = $conn->prepare("UPDATE auctions SET status = 'ended', end_time = NOW() WHERE auction_id = ?");
$stmt->bind_param("i", $auction_id);
if ($stmt->execute()) {

    // --- Notify Node.js WebSocket ---
    $payload = [
        'type' => 'auction_stopped',
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
    $context  = stream_context_create($options);
    @file_get_contents($ws_url, false, $context);

    sendSuccess(["message" => "Auction stopped successfully"]);
} else {
    sendError("Failed to stop auction", 500);
}
?>
