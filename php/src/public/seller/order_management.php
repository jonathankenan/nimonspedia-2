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
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/navbar.css">
    <link rel="stylesheet" href="/assets/css/orderManagement.css">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    
    <div class="order-management">
        <h1>Order Management</h1>
        
        <div class="status-tabs">
            <button class="status-tab active" data-status="">All Orders</button>
            <button class="status-tab" data-status="waiting_approval">Waiting Approval</button>
            <button class="status-tab" data-status="approved">Approved</button>
            <button class="status-tab" data-status="on_delivery">On Delivery</button>
            <button class="status-tab" data-status="received">Received</button>
            <button class="status-tab" data-status="rejected">Rejected</button>
        </div>

        <div class="search-bar">
            <input type="text" id="search" placeholder="Search by order ID or buyer name">
        </div>

        <div class="orders-list" id="orders-list">
            <!-- Orders will be loaded here -->
        </div>

        <div class="pagination" id="pagination">
            <!-- Pagination will be loaded here -->
        </div>
    </div>

    <!-- Order Details Modal -->
    <div id="orderModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Order Details</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body" id="orderModalBody">
                <!-- Order details will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Reject Order Modal -->
    <div id="rejectModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Reject Order</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="rejectForm">
                    <input type="hidden" id="rejectOrderId">
                    <div class="form-group">
                        <label for="rejectReason">Reason for rejection:</label>
                        <textarea id="rejectReason" required></textarea>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-danger">Confirm Rejection</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Set Delivery Time Modal -->
    <div id="deliveryModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Set Delivery Time</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="deliveryForm">
                    <input type="hidden" id="deliveryOrderId">
                    <div class="form-group">
                        <label for="deliveryTime">Expected delivery time:</label>
                        <input type="datetime-local" id="deliveryTime" required>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Set Delivery Time</button>
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