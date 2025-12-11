<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../app/config/db.php';

// Pastikan user login
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Query database untuk balance terbaru
$stmt = $conn->prepare("SELECT balance FROM users WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

$balance = $row ? floatval($row['balance']) : 0;

// Optional: sinkronkan session biar konsisten
$_SESSION['balance'] = $balance;

echo json_encode([
    'balance' => $balance,
    'user_id' => $user_id
]);

$stmt->close();
$conn->close();
