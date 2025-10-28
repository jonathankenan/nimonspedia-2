<?php
namespace App\Controllers;

use App\Models\Cart;

class CartController {
    private $cartModel;
    private $buyerId;

    public function __construct($db, $buyerId) {
        $this->cartModel = new Cart($db);
        $this->buyerId = $buyerId;
    }

    public function add() {
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
        $input = json_decode(file_get_contents('php://input'), true);
        $cartItemId = $input['cart_item_id'] ?? null;
        $quantity = $input['quantity'] ?? null;

        if (!$cartItemId || $quantity === null || $quantity < 1) {
            $this->jsonResponse(false, 'Data tidak valid.');
            return;
        }

        $success = $this->cartModel->updateItemQuantity((int)$cartItemId, (int)$quantity);
        $this->jsonResponse($success, $success ? '' : 'Gagal memperbarui keranjang.');
    }

    public function remove() {
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

    // Helper functions
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
        $response = ['success' => $success];
        if (!empty($message)) {
            $response['message'] = $message;
        }
        echo json_encode($response);
    }
}