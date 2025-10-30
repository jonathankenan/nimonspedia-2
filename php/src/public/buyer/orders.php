<?php
include_once(__DIR__ . '/../../app/utils/session.php');
include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/models/order.php');

requireLogin();
requireRole('BUYER');

use App\Models\Order;

$orderModel = new Order($conn);

$filterStatus = $_GET['status'] ?? 'all';
$validStatuses = ['all', 'waiting_approval', 'approved', 'rejected', 'on_delivery', 'received'];
if (!in_array($filterStatus, $validStatuses)) {
    $filterStatus = 'all';
}

$orders = $orderModel->getOrderHistory($_SESSION['user_id'], $filterStatus);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Riwayat Pesanan | Nimonspedia</title>
    <link rel="stylesheet" href="../assets/css/orders.css">
    <script src="../assets/js/orders.js" defer></script>
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>

    <div class="container">
        <h1>Riwayat Pesanan</h1>

        <?php if (isset($_SESSION['order_success'])): ?>
            <div class="alert alert-success">
                <?= htmlspecialchars($_SESSION['order_success']); ?>
                <?php unset($_SESSION['order_success']); ?>
            </div>
        <?php endif; ?>
        
        <div class="filter-tabs">
            <a href="?status=all" class="<?= $filterStatus === 'all' ? 'active' : '' ?>">Semua</a>
            <a href="?status=waiting_approval" class="<?= $filterStatus === 'waiting_approval' ? 'active' : '' ?>">Menunggu Persetujuan</a>
            <a href="?status=approved" class="<?= $filterStatus === 'approved' ? 'active' : '' ?>">Disetujui</a>
            <a href="?status=on_delivery" class="<?= $filterStatus === 'on_delivery' ? 'active' : '' ?>">Dikirim</a>
            <a href="?status=received" class="<?= $filterStatus === 'received' ? 'active' : '' ?>">Diterima</a>
            <a href="?status=rejected" class="<?= $filterStatus === 'rejected' ? 'active' : '' ?>">Ditolak</a>
        </div>

        <div class="order-list">
            <?php if (empty($orders)): ?>
                <div class="empty-state">
                    <p>Belum ada riwayat pesanan</p>
                </div>
            <?php else: ?>
                <?php foreach ($orders as $order): ?>
                    <div class="order-card">
                        <div class="order-header">
                            <div>
                                <p><strong>Toko:</strong> <?= htmlspecialchars($order['store_name']) ?></p>
                                <p><?= date('d F Y, H:i', strtotime($order['created_at'])) ?></p>
                            </div>
                            <div class="order-status">
                                <span class="status-badge status-<?= strtolower($order['status']) ?>"><?= ucfirst(str_replace('_', ' ', $order['status'])) ?></span>
                            </div>
                        </div>

                        <div class="order-body">
                            <?php foreach ($order['items'] as $item): ?>
                                <div class="order-item-summary">
                                    <img src="<?= htmlspecialchars($item['main_image_path']) ?>" alt="product">
                                    <p><?= htmlspecialchars($item['product_name']) ?> (<?= $item['quantity'] ?>x)</p>
                                </div>
                            <?php endforeach; ?>
                        </div>

                        <div class="order-footer">
                            <p>Total: <strong>Rp <?= number_format($order['total_price']) ?></strong></p>
                            <button class="btn-detail">Lihat Detail</button>
                        </div>
                        
                        <div class="order-details">
                            <hr>
                            <h4>Detail Produk</h4>
                            <?php foreach ($order['items'] as $item): ?>
                                <div class="order-item-detail">
                                    <img src="<?= htmlspecialchars($item['main_image_path']) ?>" alt="product">
                                    <div>
                                        <p><strong><?= htmlspecialchars($item['product_name']) ?></strong></p>
                                        <p><?= $item['quantity'] ?> x Rp <?= number_format($item['price_at_order']) ?></p>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                            <h4>Alamat Pengiriman</h4>
                            <p><?= htmlspecialchars($order['shipping_address']) ?></p>
                            <?php if ($order['status'] === 'rejected' && !empty($order['reject_reason'])): ?>
                                <h4>Alasan Ditolak</h4>
                                <p class="reason-rejected"><?= htmlspecialchars($order['reject_reason']) ?></p>
                                <p>Dana sebesar Rp <?= number_format($order['total_price']) ?> telah dikembalikan ke saldo Anda.</p>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>