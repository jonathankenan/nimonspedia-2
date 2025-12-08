<?php
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';
require_once __DIR__ . '/../../../app/utils/session.php';

// session_start(); // Handled by session.php
ensureJsonResponse();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized", 401);
}

$user_id = $_SESSION['user_id'];

// Ambil input JSON
$input = json_decode(file_get_contents("php://input"), true);

$auction_id     = $input['auction_id']     ?? null;
$starting_price = $input['starting_price'] ?? null;
$min_increment  = $input['min_increment']  ?? null;
$description    = $input['description']    ?? null;

if (!$auction_id) {
    return sendError("Missing auction_id", 400);
}

// --- 1. CEK AUCTION EXISTS & BELONGS TO SELLER ---
$stmt = $conn->prepare("
    SELECT a.auction_id, a.product_id, a.status, s.user_id AS owner_id
    FROM auctions a
    JOIN products p ON a.product_id = p.product_id
    JOIN stores s ON p.store_id = s.store_id
    WHERE a.auction_id = ?
");
$stmt->bind_param("i", $auction_id);
$stmt->execute();
$result = $stmt->get_result();
$auction = $result->fetch_assoc();

if (!$auction) {
    return sendError("Auction not found", 404);
}

if ($auction['owner_id'] != $user_id) {
    return sendError("Unauthorized: Auction does not belong to you", 403);
}

// --- 2. CEK STATUS AUCTION ---
if ($auction['status'] === 'ended' || $auction['status'] === 'cancelled') {
    return sendError("Cannot edit auction with status: {$auction['status']}", 400);
}

// --- 3. CEK APAKAH SUDAH ADA BID ---
$stmt = $conn->prepare("
    SELECT COUNT(*) as bid_count
    FROM auction_bids
    WHERE auction_id = ?
");
$stmt->bind_param("i", $auction_id);
$stmt->execute();
$bidCount = $stmt->get_result()->fetch_assoc()['bid_count'];

if ($bidCount > 0) {
    return sendError("Cannot edit auction that already has bids", 400);
}

// --- 4. UPDATE AUCTION ---
$updates = [];
$types = "";
$params = [];

if ($starting_price !== null) {
    if ($starting_price <= 0) return sendError("Invalid starting price", 400);
    $updates[] = "starting_price = ?";
    $updates[] = "current_price = ?"; 
    $types .= "dd";
    $params[] = $starting_price;
    $params[] = $starting_price;
}

if ($min_increment !== null) {
    if ($min_increment <= 0) return sendError("Invalid min increment", 400);
    $updates[] = "min_increment = ?";
    $types .= "d";
    $params[] = $min_increment;
}

if (empty($updates)) {
    return sendError("No fields to update", 400);
}

$query = "UPDATE auctions SET " . implode(", ", $updates) . " WHERE auction_id = ?";
$types .= "i";
$params[] = $auction_id;

$stmt = $conn->prepare($query);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    return sendSuccess([
        "auction_id" => (int)$auction_id,
        "message"    => "Auction updated successfully"
    ]);
} else {
    return sendError("Failed to update auction: " . $stmt->error, 500);
}
