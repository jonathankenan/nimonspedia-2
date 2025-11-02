<?php
include_once(__DIR__ . '/../../app/utils/session.php');
include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/models/cart.php');
include_once(__DIR__ . '/../../app/controllers/cartController.php');
include_once(__DIR__ . '/../../app/utils/imageHandler.php');

requireLogin();
requireRole('BUYER');

use App\Controllers\CartController;
use App\Utils\ImageHandler;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new CartController($conn, $_SESSION['user_id']);
    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'add':
            $controller->add();
            break;
        case 'update':
            $controller->update();
            break;
        case 'remove':
            $controller->remove();
            break;
        default:
            header('Location: /buyer/cart.php');
            break;
    }
    exit;
}

use App\Models\Cart;

$cartModel = new Cart($conn);
$cartItemsResult = $cartModel->getCartItems($_SESSION['user_id']);

$stores = [];
while ($item = $cartItemsResult->fetch_assoc()) {
    $item['main_image_path'] = ImageHandler::ensureImagePath(
        $item['main_image_path'],
        '/assets/images/default.png'
    );
    $stores[$item['store_id']]['store_name'] = $item['store_name'];
    $stores[$item['store_id']]['items'][] = $item;
}

$_SESSION['cart_count'] = $cartModel->getCartItemCount($_SESSION['user_id']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Shopping Cart | Nimonspedia</title>
    <link rel="stylesheet" href="../assets/css/cart.css">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    
    <script src="../assets/js/cart.js" defer></script>
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>

    <div class="container">
        <h1>Keranjang Belanja</h1>

        <?php if (empty($stores)): ?>
            <div class="empty-state">
                <p>Keranjang Anda masih kosong.</p>
                <a href="/index.php" class="btn">Mulai Belanja</a>
            </div>
        <?php else: ?>
            <div class="cart-layout">
                <div class="cart-items">
                    <?php foreach ($stores as $storeId => $store): ?>
                        <div class="store-group" data-store-id="<?= $storeId ?>">
                            <h2><?= htmlspecialchars($store['store_name']) ?></h2>
                            <?php foreach ($store['items'] as $item): ?>
                                <div class="cart-item" data-item-id="<?= $item['cart_item_id'] ?>">
                                    <img src="<?= htmlspecialchars($item['main_image_path']) ?>" alt="<?= htmlspecialchars($item['product_name']) ?>">
                                    <div class="item-details">
                                        <p class="product-name"><?= htmlspecialchars($item['product_name']) ?></p>
                                        <p class="product-price">Rp <?= number_format($item['price']) ?></p>
                                    </div>
                                    <div class="item-actions">
                                        <div class="quantity-selector">
                                            <button class="quantity-btn minus">-</button>
                                            <input type="number" class="quantity-input" value="<?= $item['quantity'] ?>" max="<?= $item['stock'] ?>">
                                            <button class="quantity-btn plus">+</button>
                                        </div>
                                        <button class="delete-btn">Hapus</button>
                                    </div>
                                    <div class="item-subtotal">
                                        <p>Subtotal: Rp <span class="subtotal-value"><?= number_format($item['price'] * $item['quantity']) ?></span></p>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div class="summary-panel">
                    <h2>Ringkasan Belanja</h2>
                    <div class="summary-item">
                        <p>Total Item</p>
                        <p id="summary-total-items">0</p>
                    </div>
                    <div id="summary-details"></div>
                    <div class="grand-total">
                        <p>Grand Total</p>
                        <p id="grand-total-value">Rp 0</p>
                    </div>
                    <a href="/buyer/checkout.php" id="checkout-btn" class="btn">Checkout</a>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <div id="confirm-delete-modal" class="modal-overlay">
        <div class="modal-content">
            <h3>Konfirmasi Penghapusan</h3>
            <p>Anda yakin ingin menghapus item ini dari keranjang?</p>
            <div class="modal-actions">
                <button id="confirm-delete-btn" class="btn btn-danger">Ya, Hapus</button>
                <button id="cancel-delete-btn" class="btn btn-secondary">Batal</button>
            </div>
        </div>
    </div>

    <div id="loading-overlay" class="loading-overlay">
        <div class="spinner"></div>
    </div>

</body>
</html>