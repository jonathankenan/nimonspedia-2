<?php
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$role = $_SESSION['role'] ?? null;
if ($role) {
    echo json_encode([
        'ok' => true,
        'role' => $role,
        'name' => $_SESSION['name'] ?? null,
        'user_id' => $_SESSION['user_id'] ?? null,
        'balance' => $_SESSION['balance'] ?? 0,
    ]);
    exit(0);
}

echo json_encode(['ok' => false]);
