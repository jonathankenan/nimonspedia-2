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

$product_id     = $input['product_id']     ?? null;
$starting_price = $input['starting_price'] ?? null;
$min_increment  = $input['min_increment']  ?? null;
$quantity       = $input['quantity']       ?? null;
$start_time     = $input['start_time']     ?? null;

// --- VALIDATION ---
if (!$product_id || !$starting_price || !$min_increment || !$quantity || !$start_time) {
    return sendError("Missing required fields", 400);
}

if ($starting_price <= 0 || $min_increment <= 0 || $quantity <= 0) {
    return sendError("Invalid numeric values", 400);
}

$db = getDatabaseConnection();

// --- 1. CEK PRODUK MILIK SELLER ---
$stmt = $db->prepare("
    SELECT p.product_id, p.stock, s.user_id AS owner_id
    FROM products p
    JOIN stores s ON p.store_id = s.store_id
    WHERE p.product_id = ?
");
$stmt->execute([$product_id]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$product) {
    return sendError("Product not found", 404);
}
if ($product['owner_id'] != $user_id) {
    return sendError("Product does not belong to seller", 403);
}

// --- 2. CEK STOCK ---
if ($quantity > $product['stock']) {
    return sendError("Not enough stock", 400);
}

// --- 3. CEK SUDAH ADA AUCTION ---
$stmt = $db->prepare("
    SELECT auction_id 
    FROM auctions 
    WHERE product_id = ? AND status IN ('scheduled', 'active')
");
$stmt->execute([$product_id]);
if ($stmt->fetch()) {
    return sendError("Product already has an upcoming or active auction", 400);
}

// --- 4. INSERT AUCTION ---
$stmt = $db->prepare("
    INSERT INTO auctions
        (product_id, starting_price, current_price, min_increment, quantity, start_time)
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $product_id,
    $starting_price,
    $starting_price,
    $min_increment,
    $quantity,
    $start_time
]);

$auction_id = $db->lastInsertId();

// --- 5. KURANGI STOCK PRODUK ---
$stmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE product_id = ?");
$stmt->execute([$quantity, $product_id]);

return sendSuccess([
    "auction_id" => (int)$auction_id,
    "product_id" => (int)$product_id,
    "status"     => "scheduled",
    "start_time" => $start_time
]);
