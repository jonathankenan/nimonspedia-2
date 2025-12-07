<?php
namespace App\Controllers;

use App\Models\Cart;
require_once __DIR__ . '/../models/feature.php';
use App\Models\Feature;

class CartController {
    private $cartModel;
    private $buyerId;
    private $db;

    public function __construct($db, $buyerId) {
        $this->db = $db;
        
        $this->cartModel = new Cart($db);
        $this->buyerId = $buyerId;
    }

    public function add() {
        $featureModel = new Feature($this->db);
        $access = $featureModel->checkAccess($this->buyerId, 'checkout_enabled');
        if (!$access['allowed']) {
            header('Location: /disabled.php?reason=' . urlencode($access['reason']));
            exit;
        }

        if (!isset($_POST['product_id'])) {
            $this->redirectWithError('cart_error=1');
        }

        $productId = (int)$_POST['product_id'];
        $quantity = (int)($_POST['quantity'] ?? 1);
        
        $success = $this->cartModel->addItem($this->buyerId, $productId, $quantity);

        if ($success) {
            $_SESSION['cart_count'] = $this->cartModel->getCartItemCount($this->buyerId);
            $this->redirectWithSuccess('cart_success=1');
        } else {
            $this->redirectWithError('cart_error=1');
        }
    }

    public function update() {

        $featureModel = new Feature($this->db);
        $access = $featureModel->checkAccess($this->buyerId, 'checkout_enabled');

        if (!$access['allowed']) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false, 
                'message' => $access['reason'],
                'redirect_url' => '/disabled.php?reason=' . urlencode($access['reason'])
            ]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $cartItemId = $input['cart_item_id'] ?? null;
        $quantity = $input['quantity'] ?? null;

        if (!$cartItemId || $quantity === null || intval($quantity) < 0) {
            $this->jsonResponse(false, 'Data tidak valid.');
            return;
        }

        $success = $this->cartModel->updateItemQuantity((int)$cartItemId, (int)$quantity);
        $this->jsonResponse($success, $success ? '' : 'Gagal memperbarui keranjang.');
    }

    public function remove() {
        $featureModel = new Feature($this->db);
        $access = $featureModel->checkAccess($this->buyerId, 'checkout_enabled');

        if (!$access['allowed']) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false, 
                'message' => $access['reason'],
                'redirect_url' => '/disabled.php?reason=' . urlencode($access['reason'])
            ]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $cartItemId = $input['cart_item_id'] ?? null;

        if (!$cartItemId) {
            $this->jsonResponse(false, 'Item tidak ditemukan.');
            return;
        }

        $success = $this->cartModel->removeItem((int)$cartItemId);
        if ($success) {
            $_SESSION['cart_count'] = $this->cartModel->getCartItemCount($this->buyerId);
            echo json_encode(['success' => true, 'new_cart_count' => $_SESSION['cart_count']]);
        } else {
            $this->jsonResponse(false, 'Gagal menghapus item.');
        }
    }

    private function redirectWithSuccess($param) {
        header('Location: ' . $_SERVER['HTTP_REFERER'] . '?' . $param);
        exit;
    }

    private function redirectWithError($param) {
        header('Location: ' . $_SERVER['HTTP_REFERER'] . '?' . $param);
        exit;
    }

    private function jsonResponse($success, $message = '') {
        header('Content-Type: application/json');
        echo json_encode(['success' => $success, 'message' => $message]);
    }
}