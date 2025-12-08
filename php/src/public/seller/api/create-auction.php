<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

ensureJsonResponse();

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
$duration_minutes = 60; // durasi lelang default 1 jam
$end_time = date('Y-m-d H:i:s', strtotime("+$duration_minutes minutes", strtotime($start_time)));

// --- VALIDATION ---
if (!$product_id || !$starting_price || !$min_increment || !$quantity || !$start_time) {
    return sendError("Missing required fields", 400);
}

if ($starting_price <= 0 || $min_increment <= 0 || $quantity <= 0) {
    return sendError("Invalid numeric values", 400);
}

// $db = getDatabaseConnection(); // PDO not available

// --- 1. CEK PRODUK MILIK SELLER ---
$stmt = $conn->prepare("
    SELECT p.product_id, p.stock, s.user_id AS owner_id
    FROM products p
    JOIN stores s ON p.store_id = s.store_id
    WHERE p.product_id = ?
");
$stmt->bind_param("i", $product_id);
$stmt->execute();
$result = $stmt->get_result();
$product = $result->fetch_assoc();

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

// --- 3. INSERT AUCTION TANPA CEK ACTIVE ---
$stmt = $conn->prepare("
    INSERT INTO auctions
        (product_id, starting_price, current_price, min_increment, quantity, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
");
$stmt->bind_param(
    "idddiss", 
    $product_id,
    $starting_price,
    $starting_price,
    $min_increment,
    $quantity,
    $start_time,
    $end_time
);

if (!$stmt->execute()) {
    return sendError("Failed to create auction: " . $stmt->error, 500);
}
$auction_id = $conn->insert_id;

// --- Kurangi stock seperti biasa ---
$stmt = $conn->prepare("UPDATE products SET stock = stock - ? WHERE product_id = ?");
$stmt->bind_param("ii", $quantity, $product_id);
$stmt->execute();

return sendSuccess([
    "auction_id" => (int)$auction_id,
    "status" => "scheduled",
    "start_time" => $start_time,
    "end_time" => $end_time
]);


// --- 4. INSERT AUCTION ---
$stmt = $conn->prepare("
    INSERT INTO auctions
        (product_id, starting_price, current_price, min_increment, quantity, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
// starting_price (d), current_price (d), min_increment (d) -> ddd
// product_id (i), quantity (i) -> ii
// start_time (s) -> s
// Types: idddis (i=int, d=double, s=string)
// product_id (i), starting_price (d), current_price (d), min_increment (d), quantity (i), start_time (s)
$stmt->bind_param("idddiss", 
    $product_id,
    $starting_price,
    $starting_price,
    $min_increment,
    $quantity,
    $start_time,
    $end_time
);

if (!$stmt->execute()) {
    return sendError("Failed to create auction: " . $stmt->error, 500);
}

$auction_id = $conn->insert_id;

// --- 5. KURANGI STOCK PRODUK ---
$stmt = $conn->prepare("UPDATE products SET stock = stock - ? WHERE product_id = ?");
$stmt->bind_param("ii", $quantity, $product_id);
$stmt->execute();

return sendSuccess([
    "auction_id" => (int)$auction_id,
    "product_id" => (int)$product_id,
    "status"     => "scheduled",
    "start_time" => $start_time,
    "end_time"   => $end_time
]);
