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

$auction_id     = $input['auction_id']     ?? null;
$starting_price = $input['starting_price'] ?? null;
$min_increment  = $input['min_increment']  ?? null;
$quantity       = $input['quantity']       ?? null;
$start_time     = $input['start_time']     ?? null;

// --- VALIDATION ---
if (!$auction_id) {
    return sendError("Missing auction_id", 400);
}

$db = getDatabaseConnection();

// --- 1. CEK AUCTION EXISTS & BELONGS TO SELLER ---
$stmt = $db->prepare("
    SELECT a.auction_id, a.product_id, a.status, a.quantity, p.stock, s.user_id AS owner_id
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

// --- 2. CEK STATUS AUCTION (HANYA BISA EDIT KALAU SCHEDULED) ---
if ($auction['status'] !== 'scheduled') {
    return sendError("Cannot edit auction with status: {$auction['status']}", 400);
}

// --- 3. CEK SUDAH ADA BID (JIKA SUDAH ADA BID, TIDAK BISA EDIT) ---
$stmt = $db->prepare("
    SELECT COUNT(*) as bid_count
    FROM auction_bids
    WHERE auction_id = ?
");
$stmt->execute([$auction_id]);
$bidCount = $stmt->fetch(PDO::FETCH_ASSOC)['bid_count'];

if ($bidCount > 0) {
    return sendError("Cannot edit auction that already has bids", 400);
}

// --- 4. VALIDATE INPUT ---
$updates = [];
$params = [];

// Validate dan prepare starting_price update
if (isset($input['starting_price']) && $input['starting_price'] !== null) {
    if ((int)$input['starting_price'] <= 0) {
        return sendError("Starting price must be greater than 0", 400);
    }
    $updates[] = "starting_price = ?";
    $updates[] = "current_price = ?";  // Reset current_price to starting_price
    $params[] = (int)$input['starting_price'];
    $params[] = (int)$input['starting_price'];
}

// Validate dan prepare min_increment update
if (isset($input['min_increment']) && $input['min_increment'] !== null) {
    if ((int)$input['min_increment'] <= 0) {
        return sendError("Min increment must be greater than 0", 400);
    }
    $updates[] = "min_increment = ?";
    $params[] = (int)$input['min_increment'];
}

// Validate dan prepare quantity update
if (isset($input['quantity']) && $input['quantity'] !== null) {
    $newQuantity = (int)$input['quantity'];
    if ($newQuantity <= 0) {
        return sendError("Quantity must be greater than 0", 400);
    }
    
    // Calculate difference in quantity
    $quantityDifference = $newQuantity - $auction['quantity'];
    
    // If quantity decreased, add back to stock
    // If quantity increased, check if enough stock
    if ($quantityDifference > 0) {
        $availableStock = $auction['stock'] + $auction['quantity'];  // Current stock + reserved stock
        if ($quantityDifference > $availableStock) {
            return sendError("Not enough stock. Available: {$availableStock}, Requested: {$quantityDifference}", 400);
        }
    }
    
    $updates[] = "quantity = ?";
    $params[] = $newQuantity;
}

// Validate dan prepare start_time update
if (isset($input['start_time']) && $input['start_time'] !== null) {
    $startTime = new DateTime($input['start_time']);
    $now = new DateTime();
    
    if ($startTime < $now) {
        return sendError("Start time must be in the future", 400);
    }
    
    $updates[] = "start_time = ?";
    $params[] = $input['start_time'];
}

// --- 5. JIKA TIDAK ADA UPDATE, RETURN ERROR ---
if (empty($updates)) {
    return sendError("No fields to update", 400);
}

// --- 6. UPDATE AUCTION ---
$params[] = $auction_id;
$stmt = $db->prepare("UPDATE auctions SET " . implode(", ", $updates) . " WHERE auction_id = ?");
$stmt->execute($params);

// --- 7. ADJUST PRODUCT STOCK JIKA QUANTITY BERUBAH ---
if (isset($input['quantity']) && $input['quantity'] !== null) {
    $newQuantity = (int)$input['quantity'];
    $quantityDifference = $newQuantity - $auction['quantity'];
    
    // Decrease stock dari product
    $stmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE product_id = ?");
    $stmt->execute([$quantityDifference, $auction['product_id']]);
}

// --- 8. GET UPDATED AUCTION & RETURN ---
$stmt = $db->prepare("
    SELECT 
        auction_id,
        product_id,
        starting_price,
        current_price,
        min_increment,
        quantity,
        start_time,
        status
    FROM auctions
    WHERE auction_id = ?
");
$stmt->execute([$auction_id]);
$updatedAuction = $stmt->fetch(PDO::FETCH_ASSOC);

return sendSuccess([
    "auction_id"      => (int)$updatedAuction['auction_id'],
    "product_id"      => (int)$updatedAuction['product_id'],
    "starting_price"  => (int)$updatedAuction['starting_price'],
    "current_price"   => (int)$updatedAuction['current_price'],
    "min_increment"   => (int)$updatedAuction['min_increment'],
    "quantity"        => (int)$updatedAuction['quantity'],
    "start_time"      => $updatedAuction['start_time'],
    "status"          => $updatedAuction['status'],
    "message"         => "Auction updated successfully"
]);
?>
