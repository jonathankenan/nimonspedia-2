<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/components/navbar.php');

requireRole('SELLER');

$storeId = $_SESSION['store_id'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Management</title>
    <link rel="stylesheet" href="/assets/css/orderManagement.css">
    <link rel="stylesheet" href="/assets/css/pagination.css">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    <div class="order-management">
        <h1>Pesanan Toko</h1>
        
        <div class="status-tabs">
            <button class="status-tab active" data-status="">All</button>
            <button class="status-tab" data-status="waiting_approval">Waiting approval</button>
            <button class="status-tab" data-status="approved">Approved</button>
            <button class="status-tab" data-status="on_delivery">On delivery</button>
            <button class="status-tab" data-status="received">Received</button>
            <button class="status-tab" data-status="rejected">Rejected</button>
        </div>

        <div class="search-bar">
            <input type="text" id="search" placeholder="Cari berdasarkan Order ID atau nama pembeli">
        </div>

        <div class="orders-list" id="orders-list">
            <!-- Pesanan akan dimuat di sini oleh orderManagement.js -->
        </div>

        <div class="pagination" id="pagination">
            <!-- Pagination akan dimuat di sini oleh orderManagement.js -->
        </div>
    </div>

    <!-- Order Details Modal -->
    <div id="orderModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Detail Pesanan</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body" id="orderModalBody">
                <!-- Detail pesanan akan dimuat di sini -->
            </div>
        </div>
    </div>

    <!-- Reject Order Modal -->
    <div id="rejectModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Tolak Pesanan</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="rejectForm">
                    <input type="hidden" id="rejectOrderId">
                    <div class="form-group">
                        <label for="rejectReason">Alasan penolakan:</label>
                        <textarea id="rejectReason" required></textarea>
                    </div>
                    <div class="form-group modal-actions">
                        <button type="submit" class="btn btn-danger">Konfirmasi Tolak</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Set Delivery Time Modal -->
    <div id="deliveryModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Atur Waktu Pengiriman</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="deliveryForm">
                    <input type="hidden" id="deliveryOrderId">
                    <div class="form-group">
                        <label for="deliveryTime">Perkiraan waktu tiba:</label>
                        <input type="datetime-local" id="deliveryTime" required>
                    </div>
                    <div class="form-group modal-actions">
                        <button type="submit" class="btn btn-primary btn-atur-waktu">Atur Waktu</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        const storeId = <?php echo json_encode($storeId); ?>;
    </script>
    <script src="/assets/js/orderManagement.js"></script>
</body>
</html>