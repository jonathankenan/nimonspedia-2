<?php
namespace App\Controllers;

use App\Models\Cart;
use App\Models\User;
use App\Models\Order;

class CheckoutController {
    private $conn;
    private $userId;

    public function __construct($db, $userId) {
        $this->conn = $db;
        $this->userId = $userId;
    }

    public function processCheckout() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Location: /buyer/cart.php');
            exit;
        }

        $cartModel = new Cart($this->conn);
        $cartItemsResult = $cartModel->getCartItems($this->userId);

        if ($cartItemsResult->num_rows === 0) {
            header('Location: /buyer/cart.php'); // Redirect jika keranjang kosong
            exit;
        }
        
        // Kelompokkan item dan hitung total per toko
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

        // Validasi Saldo
        $userModel = new User($this->conn);
        $user = $userModel->findById($this->userId);
        if ($user['balance'] < $grandTotal) {
            $_SESSION['checkout_error'] = "Saldo Anda tidak mencukupi untuk transaksi ini.";
            header('Location: /buyer/checkout.php');
            exit;
        }

        // Jalankan proses pembuatan order
        $orderModel = new Order($this->conn);
        $shippingAddress = $_POST['shipping_address'] ?? $user['address'];
        
        $success = $orderModel->createOrderFromCart($this->userId, $itemsByStore, $shippingAddress);

        if ($success) {
            // Hapus error session jika ada, set pesan sukses
            unset($_SESSION['checkout_error']);
            $_SESSION['order_success'] = "Pesanan Anda berhasil dibuat!";
            header('Location: /buyer/orders.php'); // Redirect ke Riwayat Pesanan
            exit;
        } else {
            header('Location: /buyer/checkout.php'); // Redirect kembali ke checkout dengan pesan error
            exit;
        }
    }
}