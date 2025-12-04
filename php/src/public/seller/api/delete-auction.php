<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

session_start();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized", 401);
}

$user_id = $_SESSION['user_id'];

// Ambil input JSON
$input = json_decode(file_get_contents("php://input"), true);

$auction_id = $input['auction_id'] ?? null;

// --- VALIDATION ---
if (!$auction_id) {
    return sendError("Missing auction_id", 400);
}

$db = getDatabaseConnection();

// --- 1. CEK AUCTION EXISTS & BELONGS TO SELLER ---
$stmt = $db->prepare("
    SELECT a.auction_id, a.product_id, a.status, a.quantity, s.user_id AS owner_id
    FROM auctions a
    JOIN products p ON a.product_id = p.product_id
    JOIN stores s ON p.store_id = s.store_id
    WHERE a.auction_id = ?
");
$stmt->execute([$auction_id]);
$auction = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$auction) {
    return sendError("Auction not found", 404);
}

if ($auction['owner_id'] != $user_id) {
    return sendError("Unauthorized: Auction does not belong to you", 403);
}

// --- 2. CEK STATUS AUCTION (HANYA BISA DELETE KALAU SCHEDULED ATAU ACTIVE TANPA BID) ---
if ($auction['status'] === 'ended' || $auction['status'] === 'cancelled') {
    return sendError("Cannot delete auction with status: {$auction['status']}", 400);
}

// --- 3. CEK APAKAH SUDAH ADA BID ---
$stmt = $db->prepare("
    SELECT COUNT(*) as bid_count
    FROM auction_bids
    WHERE auction_id = ?
");
$stmt->execute([$auction_id]);
$bidCount = $stmt->fetch(PDO::FETCH_ASSOC)['bid_count'];

if ($bidCount > 0) {
    return sendError("Cannot delete auction that already has bids", 400);
}

// --- 4. DELETE AUCTION ---
$stmt = $db->prepare("DELETE FROM auctions WHERE auction_id = ?");
$stmt->execute([$auction_id]);

// --- 5. KEMBALIKAN STOCK PRODUK ---
$stmt = $db->prepare("
    UPDATE products 
    SET stock = stock + ? 
    WHERE product_id = ?
");
$stmt->execute([$auction['quantity'], $auction['product_id']]);

return sendSuccess([
    "auction_id" => (int)$auction_id,
    "message"    => "Auction deleted successfully",
    "stock_restored" => (int)$auction['quantity']
]);
?>
