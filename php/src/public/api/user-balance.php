<?php
session_start();
header('Content-Type: application/json');

// Pastikan user login
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Ambil balance dari session atau database
$balance = $_SESSION['balance'] ?? 0;
$user_id = $_SESSION['user_id'] ?? 0; // sekalian dah

echo json_encode([
    'balance' => $balance,
    'user_id' => $user_id
]);
