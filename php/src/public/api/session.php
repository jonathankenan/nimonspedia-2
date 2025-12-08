<?php
require_once __DIR__ . '/../../app/utils/session.php';

header('Content-Type: application/json');

if (isLoggedIn()) {
    echo json_encode([
        'ok' => true,
        'role' => $_SESSION['role'],
        'name' => $_SESSION['name'] ?? null,
        'user_id' => $_SESSION['user_id'],
        'balance' => $_SESSION['balance'] ?? 0,
    ]);
} else {
    echo json_encode(['ok' => false]);
}
