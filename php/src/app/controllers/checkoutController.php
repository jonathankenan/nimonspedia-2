<?php
namespace App\Controllers;

use App\Models\Cart;
use App\Models\User;
use App\Models\Order;
require_once __DIR__ . '/../models/feature.php';
use App\Models\Feature;
require_once __DIR__ . '/../utils/pushNotificationHelper.php';
use App\Utils\PushNotificationHelper;

class CheckoutController {
    private $conn;
    private $userId;

    public function __construct($db, $userId) {
        $this->conn = $db;
        $this->userId = $userId;
    }
    
    public function process() {
        $access = (new Feature($this->conn))->checkAccess($this->userId, 'checkout_enabled');
        if (!$access['allowed']) {
            header('Location: /disabled.php?reason=' . urlencode($access['reason']));
            exit;
        }

        $cartModel = new Cart($this->conn);
        $cartItemsResult = $cartModel->getCartItems($this->userId);

        if ($cartItemsResult->num_rows === 0) {
            header('Location: /buyer/cart.php');
            exit;
        }
        
        $itemsByStore = [];
        $grandTotal = 0;
        
        while ($item = $cartItemsResult->fetch_assoc()) {
            $storeId = $item['store_id'];
            if (!isset($itemsByStore[$storeId])) {
                $itemsByStore[$storeId] = ['items' => [], 'total_price' => 0];
            }
            $itemsByStore[$storeId]['items'][] = $item;
            $itemsByStore[$storeId]['total_price'] += $item['price'] * $item['quantity'];
            $grandTotal += $item['price'] * $item['quantity'];
        }

        $userModel = new User($this->conn);
        $user = $userModel->findById($this->userId);
        
        if ($user['balance'] < $grandTotal) {
            $_SESSION['checkout_error'] = "Saldo Anda tidak mencukupi untuk transaksi ini.";
            header('Location: /buyer/checkout.php');
            exit;
        }

        $orderModel = new Order($this->conn);
        $shippingAddress = $_POST['shipping_address'] ?? $user['address'];
        
        $orderIds = $orderModel->createOrderFromCart($this->userId, $itemsByStore, $shippingAddress);

        if ($orderIds && is_array($orderIds) && count($orderIds) > 0) {
            $_SESSION['balance'] = $user['balance'] - $grandTotal;
            unset($_SESSION['checkout_error']);
            $_SESSION['order_success'] = "Pesanan Anda berhasil dibuat!";
            
            // Send notification to each seller
            if (is_array($itemsByStore)) {
                foreach ($itemsByStore as $storeId => $storeData) {
                    // Get seller user_id from store
                    $storeQuery = $this->conn->query("SELECT user_id FROM stores WHERE store_id = $storeId");
                    if ($storeRow = $storeQuery->fetch_assoc()) {
                        $sellerId = $storeRow['user_id'];
                        
                        // Find the order_id for this store
                        $orderIdForStore = null;
                        foreach ($orderIds as $oid) {
                            $checkOrder = $this->conn->query("SELECT order_id FROM orders WHERE order_id = $oid AND store_id = $storeId");
                            if ($checkOrder && $checkOrder->num_rows > 0) {
                                $orderIdForStore = $oid;
                                break;
                            }
                        }
                        
                        if ($orderIdForStore) {
                            PushNotificationHelper::sendOrderNotification(
                                $sellerId,
                                'waiting_approval',
                                $orderIdForStore,
                                'SELLER'
                            );
                        }
                    }
                }
            }
            
            header('Location: /buyer/orders.php');
            exit;
        } else {
            $_SESSION['checkout_error'] = "Terjadi kesalahan saat memproses pesanan.";
            header('Location: /buyer/checkout.php');
            exit;
        }
    }
}