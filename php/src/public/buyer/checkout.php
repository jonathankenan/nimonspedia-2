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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new CheckoutController($conn, $_SESSION['user_id']);
    $controller->process();
    exit;
}

use App\Models\Cart;
use App\Models\User;

$cartModel = new Cart($conn);
$cartItemsResult = $cartModel->getCartItems($_SESSION['user_id']);

if ($cartItemsResult->num_rows === 0) {
    header('Location: /buyer/cart.php');
    exit;
}

$userModel = new User($conn);
$user = $userModel->findById($_SESSION['user_id']);

$stores = [];
$grandTotal = 0;
while ($item = $cartItemsResult->fetch_assoc()) {
    $storeId = $item['store_id'];
    $stores[$storeId]['store_name'] = $item['store_name'];
    $stores[$storeId]['items'][] = $item;
    $stores[$storeId]['total_price'] = ($stores[$storeId]['total_price'] ?? 0) + ($item['price'] * $item['quantity']);
    $grandTotal += $item['price'] * $item['quantity'];
}

$balanceSufficient = $user['balance'] >= $grandTotal;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Checkout | Nimonspedia</title>
    <link rel="stylesheet" href="../assets/css/checkout.css">
    <script src="../assets/js/checkout.js" defer></script>
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    <div class="container">
        <h1>Checkout</h1>

        <?php if (isset($_SESSION['checkout_error'])): ?>
            <div class="alert alert-error">
                <?= htmlspecialchars($_SESSION['checkout_error']); ?>
                <?php unset($_SESSION['checkout_error']); ?>
            </div>
        <?php endif; ?>

        <form id="checkout-form" action="checkout.php" method="POST">
            <div class="checkout-layout">
                <div class="main-content">
                    <div class="checkout-section">
                        <h2>Alamat Pengiriman</h2>
                        <textarea name="shipping_address" required><?= htmlspecialchars($user['address']) ?></textarea>
                    </div>

                    <div class="checkout-section">
                        <h2>Ringkasan Pesanan</h2>
                        <?php foreach ($stores as $storeData): ?>
                            <div class="store-summary">
                                <h3><?= htmlspecialchars($storeData['store_name']) ?></h3>
                                <?php foreach ($storeData['items'] as $item): ?>
                                <div class="item-summary">
                                    <img src="<?= htmlspecialchars($item['main_image_path']) ?>" alt="product">
                                    <div class="item-info">
                                        <p><?= htmlspecialchars($item['product_name']) ?></p>
                                        <p><?= $item['quantity'] ?> x Rp <?= number_format($item['price']) ?></p>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                                <div class="store-total">
                                    <p>Total Toko:</p>
                                    <p><strong>Rp <?= number_format($storeData['total_price']) ?></strong></p>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="payment-panel">
                    <h2>Pembayaran</h2>
                    <div class="balance-info">
                        <p>Saldo Anda:</p>
                        <p><strong>Rp <?= number_format($user['balance']) ?></strong></p>
                    </div>
                    <div class="balance-info">
                        <p>Total Belanja:</p>
                        <p><strong>Rp <?= number_format($grandTotal) ?></strong></p>
                    </div>
                    <hr>
                    <div class="balance-info final">
                        <p>Sisa Saldo:</p>
                        <p class="<?= $balanceSufficient ? 'sufficient' : 'insufficient' ?>">
                            <strong>Rp <?= number_format($user['balance'] - $grandTotal) ?></strong>
                        </p>
                    </div>
                    
                    <?php if (!$balanceSufficient): ?>
                        <div class="alert alert-warning">
                            Saldo Anda tidak cukup. Silakan <a href="#" id="topup-link">Top-up</a>.
                        </div>
                    <?php endif; ?>

                    <button type="submit" id="pay-button" class="btn" <?= !$balanceSufficient ? 'disabled' : '' ?>>
                        Bayar Sekarang
                    </button>
                </div>
            </div>
        </form>
    </div>

    <div id="confirm-checkout-modal" class="modal-overlay">
        <div class="modal-content">
            <h3>Konfirmasi Pembayaran</h3>
            <p>Pastikan saldo dan alamat pengiriman Anda sudah benar. Lanjutkan pembayaran?</p>
            <div class="modal-actions">
                <button id="confirm-checkout-btn" class="btn">Ya</button>
                <button id="cancel-checkout-btn" class="btn btn-danger">Batal</button>
            </div>
        </div>
    </div>

</body>
</html>