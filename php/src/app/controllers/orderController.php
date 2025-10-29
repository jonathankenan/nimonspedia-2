<?php
namespace App\Controllers;

require_once __DIR__ . '/../models/order.php';
require_once __DIR__ . '/../utils/json_response.php';
require_once __DIR__ . '/../utils/session.php';

use App\Models\Order;
use App\Utils\Session;

class OrderController {
    private $orderModel;
    private $session;

    public function __construct($conn) {
        $this->orderModel = new Order($conn);
        $this->session = new Session();
    }

    public function getOrders() {
        try {
            if (!$this->session->isLoggedIn() || $this->session->getRole() !== 'seller') {
                return json_response(['error' => 'Unauthorized'], 401);
            }

            $storeId = $_GET['store_id'] ?? null;
            if (!$storeId) {
                return json_response(['error' => 'Store ID is required'], 400);
            }

            $status = $_GET['status'] ?? null;
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $search = $_GET['search'] ?? '';

            $result = $this->orderModel->getOrdersByStoreId(
                $storeId,
                $status,
                $page,
                10, // items per page
                $search
            );

            return json_response($result);
        } catch (\Exception $e) {
            return json_response(['error' => $e->getMessage()], 500);
        }
    }

    public function getOrderDetails() {
        try {
            if (!$this->session->isLoggedIn() || $this->session->getRole() !== 'seller') {
                return json_response(['error' => 'Unauthorized'], 401);
            }

            $orderId = $_GET['order_id'] ?? null;
            $storeId = $_GET['store_id'] ?? null;

            if (!$orderId || !$storeId) {
                return json_response(['error' => 'Order ID and Store ID are required'], 400);
            }

            $order = $this->orderModel->getOrderDetails($orderId, $storeId);
            if (!$order) {
                return json_response(['error' => 'Order not found'], 404);
            }

            return json_response($order);
        } catch (\Exception $e) {
            return json_response(['error' => $e->getMessage()], 500);
        }
    }

    public function updateStatus() {
        try {
            if (!$this->session->isLoggedIn() || $this->session->getRole() !== 'seller') {
                return json_response(['error' => 'Unauthorized'], 401);
            }

            $orderId = $_POST['order_id'] ?? null;
            $storeId = $_POST['store_id'] ?? null;
            $status = $_POST['status'] ?? null;

            if (!$orderId || !$storeId || !$status) {
                return json_response(['error' => 'Missing required fields'], 400);
            }

            $data = [];
            if ($status === 'rejected') {
                $data['reject_reason'] = $_POST['reject_reason'] ?? null;
                if (!$data['reject_reason']) {
                    return json_response(['error' => 'Reject reason is required'], 400);
                }
            } else if ($status === 'on_delivery') {
                $data['delivery_time'] = $_POST['delivery_time'] ?? null;
                if (!$data['delivery_time']) {
                    return json_response(['error' => 'Delivery time is required'], 400);
                }
            }

            $this->orderModel->updateOrderStatus($orderId, $storeId, $status, $data);
            return json_response(['message' => 'Order status updated successfully']);
        } catch (\Exception $e) {
            return json_response(['error' => $e->getMessage()], 500);
        }
    }
}