<?php
include_once(__DIR__ . '/../../app/utils/session.php');
include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/models/cart.php');
include_once(__DIR__ . '/../../app/models/user.php');
include_once(__DIR__ . '/../../app/models/order.php');
include_once(__DIR__ . '/../../app/controllers/checkoutController.php');

requireLogin();
requireRole('BUYER');

use App\Controllers\CheckoutController;

$controller = new CheckoutController($conn, $_SESSION['user_id']);
$controller->processCheckout();