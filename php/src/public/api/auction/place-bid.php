<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/models/feature.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

use App\Models\Feature;

ensureJsonResponse();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'BUYER') {
    return sendError("Unauthorized: only buyers can place bids", 401);
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

// Ambil input JSON
$input = json_decode(file_get_contents("php://input"), true);
$auction_id = $input['auction_id'] ?? null;
$bid_amount = $input['bid_amount'] ?? null;

if (!$auction_id || !$bid_amount || $bid_amount <= 0) {
    return sendError("Missing or invalid bid parameters", 400);
}

$conn->begin_transaction();

try {
    // --- 1. Cari current highest bid sebelum bid baru ---
    $stmt = $conn->prepare("
        SELECT bidder_id, bid_amount 
        FROM auction_bids 
        WHERE auction_id = ? 
        ORDER BY bid_amount DESC, bid_time ASC 
        LIMIT 1
    ");
    $stmt->bind_param("i", $auction_id);
    $stmt->execute();
    $prev_bid = $stmt->get_result()->fetch_assoc();

    // --- 2. Kurangi balance user yang melakukan bid ---
    // Cek apakah user sebelumnya sudah menawar di auction ini
    $prev_user_bid_amount = 0;
    $stmt = $conn->prepare("
        SELECT bid_amount 
        FROM auction_bids 
        WHERE auction_id = ? AND bidder_id = ?
        ORDER BY bid_time DESC
        LIMIT 1
    ");
    $stmt->bind_param("ii", $auction_id, $user_id);
    $stmt->execute();
    $my_prev_bid = $stmt->get_result()->fetch_assoc();
    if ($my_prev_bid) {
        $prev_user_bid_amount = $my_prev_bid['bid_amount'];
    }

    // Hitung selisih yang harus dikurangi dari balance
    $amount_to_deduct = $bid_amount - $prev_user_bid_amount;
    if ($amount_to_deduct > 0) {
        $stmt = $conn->prepare("UPDATE users SET balance = balance - ? WHERE user_id = ?");
        $stmt->bind_param("di", $amount_to_deduct, $user_id);
        $stmt->execute();
    }

    $_SESSION['balance'] = ($_SESSION['balance'] ?? 0) - $amount_to_deduct;

    // --- 3. Refund user sebelumnya (kalau ada dan bukan diri sendiri) ---
    if ($prev_bid && $prev_bid['bidder_id'] != $user_id) {
        $refund_amount = $prev_bid['bid_amount'];
        $stmt = $conn->prepare("UPDATE users SET balance = balance + ? WHERE user_id = ?");
        $stmt->bind_param("di", $refund_amount, $prev_bid['bidder_id']);
        $stmt->execute();
    }

    // --- 4. Update current_price di auctions ---
    $stmt = $conn->prepare("UPDATE auctions SET current_price = ? WHERE auction_id = ?");
    $stmt->bind_param("di", $bid_amount, $auction_id);
    $stmt->execute();

    // --- 5. Insert ke auction_bids ---
    $stmt = $conn->prepare("
        INSERT INTO auction_bids (auction_id, bidder_id, bid_amount, bid_time)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->bind_param("iid", $auction_id, $user_id, $bid_amount);
    $stmt->execute();

    $conn->commit();

    // --- 6. Notify Node.js WebSocket ---
    $payload = [
        'type' => 'auction_bid_update', // untuk update current_price
        'auction_id' => $auction_id,
        'current_price' => $bid_amount,
        'bidder_name' => $_SESSION['name'] ?? 'Anonymous'
    ];

    // Kirim juga balance update
    $balancePayload = [
        'type' => 'balance_update',
        'user_id' => $user_id,
        'balance' => $_SESSION['balance']// kalau balance disimpan di session
    ];

    $ws_url = "http://node:3003/notify_bid"; // endpoint Node.js
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

    // balance update
    $balanceWsUrl = "http://node:3003/notify_balance";
    $options['content'] = json_encode($balancePayload);
    @file_get_contents($balanceWsUrl, false, $context);

} catch (Exception $e) {
    $conn->rollback();
    return sendError("Failed to place bid: " . $e->getMessage(), 500);
}
