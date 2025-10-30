<?php
namespace App\Controllers;

require_once __DIR__ . '/../models/order.php';
require_once __DIR__ . '/../utils/json_response.php';
require_once __DIR__ . '/../utils/session.php';

use App\Models\Order;

class OrderController {
    private $orderModel;

    public function __construct($conn) {
        $this->orderModel = new Order($conn);
    }

    public function getOrders() {
        try {
            if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
                return jsonResponse(['error' => 'Unauthorized'], 401);
            }

            $storeId = $_GET['store_id'] ?? null;
            if (!$storeId) {
                return jsonResponse(['error' => 'Store ID is required'], 400);
            }

            $status = $_GET['status'] ?? null;
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $search = $_GET['search'] ?? '';

            $result = $this->orderModel->getOrdersByStoreId(
                $storeId,
                $status,
                $page,
                10, 
                $search
            );

            return jsonResponse($result);
        } catch (\Exception $e) {
            return jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    public function getOrderDetails() {
        try {
            if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
                return jsonResponse(['error' => 'Unauthorized'], 401);
            }

            $orderId = $_GET['order_id'] ?? null;
            $storeId = $_GET['store_id'] ?? null;

            if (!$orderId || !$storeId) {
                return jsonResponse(['error' => 'Order ID and Store ID are required'], 400);
            }

            $order = $this->orderModel->getOrderDetails($orderId, $storeId);
            if (!$order) {
                return jsonResponse(['error' => 'Order not found'], 404);
            }

            return jsonResponse($order);
        } catch (\Exception $e) {
            return jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    public function updateStatus() {
        try {
            if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
                return jsonResponse(['error' => 'Unauthorized'], 401);
            }

            $orderId = $_POST['order_id'] ?? null;
            $storeId = $_POST['store_id'] ?? null;
            $status = $_POST['status'] ?? null;

            if (!$orderId || !$storeId || !$status) {
                return jsonResponse(['error' => 'Missing required fields'], 400);
            }

            $data = [];
            if ($status === 'rejected') {
                $data['reject_reason'] = $_POST['reject_reason'] ?? null;
                if (!$data['reject_reason']) {
                    return jsonResponse(['error' => 'Reject reason is required'], 400);
                }
            } else if ($status === 'on_delivery') {
                $data['delivery_time'] = $_POST['delivery_time'] ?? null;
                if (!$data['delivery_time']) {
                    return jsonResponse(['error' => 'Delivery time is required'], 400);
                }
            }

            $this->orderModel->updateOrderStatus($orderId, $storeId, $status, $data);
            return jsonResponse(['message' => 'Order status updated successfully']);
        } catch (\Exception $e) {
            return jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
}