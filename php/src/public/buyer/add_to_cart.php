<?php
include_once(__DIR__ . '/../../app/utils/session.php');
include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/models/cart.php');
include_once(__DIR__ . '/../../app/controllers/cartController.php');

requireLogin();
requireRole('BUYER');

use App\Controllers\CartController;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new CartController($conn, $_SESSION['user_id']);
    $controller->add();
} else {
    header('Location: /buyer/dashboard.php');
    exit;
}