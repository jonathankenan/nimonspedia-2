<?php
require_once __DIR__ . '/../../app/utils/session.php';
require_once __DIR__ . '/../../app/config/db.php';
require_once __DIR__ . '/../../app/utils/json_response.php';

ensureJsonResponse();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'BUYER') {
    return sendError("Unauthorized: only buyers can place bids", 401);
}

$user_id = $_SESSION['user_id'];

// Ambil input JSON
$input = json_decode(file_get_contents("php://input"), true);
$auction_id = $input['auction_id'] ?? null;
$bid_amount = $input['bid_amount'] ?? null;

if (!$auction_id || !$bid_amount || $bid_amount <= 0) {
    return sendError("Missing or invalid bid parameters", 400);
}

// --- 1. Ambil detail auction ---
$stmt = $conn->prepare("
    SELECT a.auction_id, a.current_price, a.min_increment, a.status, a.end_time, u.balance
    FROM auctions a
    JOIN users u ON u.user_id = ?
    WHERE a.auction_id = ?
");
$stmt->bind_param("ii", $user_id, $auction_id);
$stmt->execute();
$result = $stmt->get_result();
$auction = $result->fetch_assoc();

if (!$auction) {
    return sendError("Auction not found", 404);
}

// --- 2. Validasi status lelang ---
if ($auction['status'] !== 'active') {
    return sendError("Auction is not active", 400);
}

// --- 3. Validasi minimal bid ---
$min_bid = $auction['current_price'] + $auction['min_increment'];
if ($bid_amount < $min_bid) {
    return sendError("Bid must be at least $min_bid", 400);
}

// --- 4. Validasi saldo user ---
if ($bid_amount > $auction['balance']) {
    return sendError("Insufficient balance", 400);
}

// --- 5. Update current_price & insert bid history ---
$conn->begin_transaction();

try {
    // Update current_price di auctions
    $stmt = $conn->prepare("UPDATE auctions SET current_price = ? WHERE auction_id = ?");
    $stmt->bind_param("di", $bid_amount, $auction_id);
    $stmt->execute();

    // Insert ke auction_bids
    $stmt = $conn->prepare("
        INSERT INTO auction_bids (auction_id, bidder_id, bid_amount, bid_time)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->bind_param("iid", $auction_id, $user_id, $bid_amount);
    $stmt->execute();

    $conn->commit();

    return sendSuccess([
        "auction_id" => (int)$auction_id,
        "bid_amount" => (float)$bid_amount,
        "message" => "Bid placed successfully"
    ]);
} catch (Exception $e) {
    $conn->rollback();
    return sendError("Failed to place bid: " . $e->getMessage(), 500);
}
?>
