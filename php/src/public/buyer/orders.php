<?php
include_once(__DIR__ . '/../../app/utils/session.php');
include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/models/order.php');

requireLogin();
requireRole('BUYER');

use App\Models\Order;

date_default_timezone_set('Asia/Jakarta'); 
$currentTime = time();

$orderModel = new Order($conn);

$filterStatus = $_GET['status'] ?? 'all';
$displayOrder = ['all', 'waiting_approval', 'approved', 'on_delivery', 'received', 'rejected'];

if (!in_array($filterStatus, $displayOrder)) {
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

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    
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
            <?php foreach ($displayOrder as $status): ?>
                <a href="?status=<?= $status ?>" class="<?= $filterStatus === $status ? 'active' : '' ?>">
                    <?= $status === 'all' ? 'All' : ucfirst(str_replace('_', ' ', $status)) ?>
                </a>
            <?php endforeach; ?>
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
                                <p><strong>Order Id:</strong> #<?= htmlspecialchars($order['order_id']) ?></p>
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
                        
                        <?php if ($order['status'] === 'on_delivery'): ?>
                            <?php
                                $deliveryTime = !empty($order['delivery_time']) ? strtotime($order['delivery_time']) : 0;
                                $canConfirm = !empty($deliveryTime) && ($currentTime >= $deliveryTime);
                                
                                $title = 'Konfirmasi barang telah diterima'; 
                                if (empty($deliveryTime)) {
                                    $title = 'Penjual belum mengatur estimasi pengiriman.';
                                } else if (!$canConfirm) {
                                    $title = 'Tombol akan aktif pada ' . date('d F Y', $deliveryTime);
                                }
                            ?>
                            <div class="order-confirmation-action">
                                <button 
                                    class="btn-confirm-received" 
                                    data-order-id="<?= $order['order_id'] ?>"
                                    <?= ($canConfirm) ? '' : 'disabled' ?>
                                    title="<?= htmlspecialchars($title) ?>"
                                >
                                    Konfirmasi Terima Barang
                                </button>
                            </div>
                        <?php endif; ?>
                        
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
                            
                            <?php if ($order['status'] === 'on_delivery'): ?>
                                <h4>Estimasi Tiba</h4>
                                <?php if (!empty($order['delivery_time'])): ?>
                                    <p><?= date('d F Y', strtotime($order['delivery_time'])) ?></p>
                                <?php else: ?>
                                    <p>Penjual belum mengatur estimasi pengiriman.</p>
                                <?php endif; ?>
                            <?php endif; ?>

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
    
    <div id="confirm-reception-modal" class="modal">
        <div class="modal-content">
            <span id="close-reception-modal" class="close-btn">&times;</span>
            <h2>Konfirmasi Penerimaan</h2>
            <p>Apakah Anda yakin barang sudah diterima? Tindakan ini akan menyelesaikan pesanan dan tidak dapat dibatalkan.</p>
            <div class="modal-buttons">
                <button id="cancel-reception-btn" class="btn btn-secondary">Batal</button>
                <button id="confirm-reception-btn" class="btn btn-primary">Ya, Sudah Diterima</button>
            </div>
        </div>
    </div>

</body>
</html>