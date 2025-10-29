<?php
require_once __DIR__ . '/../../../app/controllers/orderController.php';
require_once __DIR__ . '/../../../app/config/db.php';

use App\Controllers\OrderController;

$controller = new OrderController($conn);

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['order_id'])) {
            echo $controller->getOrderDetails();
        } else {
            echo $controller->getOrders();
        }
        break;
    case 'POST':
        echo $controller->updateStatus();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}