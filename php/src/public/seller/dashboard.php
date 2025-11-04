<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/models/store.php');
require_once(__DIR__ . '/../../app/models/product.php');
require_once(__DIR__ . '/../../app/models/order.php');

use App\Models\Store;
use App\Models\Product;
use App\Models\Order;

requireRole('SELLER');

$name = $_SESSION['name'] ?? 'Penjual';
$balance = $_SESSION['balance'] ?? 0;
$storeId = $_SESSION['store_id'];

$storeModel = new Store($conn);
$store = $storeModel->getById($storeId);

$productModel = new Product($conn);
$orderModel = new Order($conn);

$totalProducts = $productModel->countByStoreId($storeId);
$lowStockProducts = $productModel->countLowStockByStoreId($storeId);
$pendingOrders = $orderModel->countPendingByStoreId($storeId);
$totalRevenue = $orderModel->calculateTotalRevenueByStoreId($storeId);

?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8">
    <title>Dashboard Seller</title>
  <link rel="stylesheet" href="/assets/css/sellerDashboard.css">
  <link rel="stylesheet" href="/assets/css/toast.css">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
  
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  </head>
  <body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    <div class="dashboard-container">
      <h1>Selamat Datang, <?= htmlspecialchars($store['store_name'] ?? $name) ?>!</h1>

      <!-- Store Info Card -->
      <div class="store-info-card">
        <h2>Informasi Toko Anda</h2>
        <form id="editStoreForm" class="store-edit-form" method="POST" enctype="multipart/form-data">
          
          <!-- Kolom Kiri: Logo -->
          <div class="store-logo-section">
            <div class="store-logo">
              <img id="storeLogoPreview" src="<?= htmlspecialchars($store['store_logo_path']) ?>" alt="Logo Toko">
            </div>
            <div class="logo-controls">
              <label for="storeLogo" class="upload-logo-btn">Ubah Logo</label>
              <input type="file" id="storeLogo" name="storeLogo" accept="image/*">
            </div>
          </div>
          
          <!-- Kolom Kanan: Form -->
          <div class="form-fields-container">
            <div class="form-group">
              <label for="storeName">Nama Toko</label>
              <input type="text" id="storeName" name="storeName" value="<?= htmlspecialchars($store['store_name'] ?? '') ?>" required>
            </div>
            <div class="form-group">
              <label for="editor">Deskripsi Toko</label>
              <div id="editor"><?= $store['store_description'] ?? '' ?></div>
              <input type="hidden" name="storeDescription" id="storeDescription">
            </div>
            <button type="submit" class="save-button">Simpan Perubahan</button>
          </div>
        </form>
        <p class="store-balance">Saldo Toko: Rp <?= number_format($store['balance'] ?? 0, 0, ',', '.') ?></p>
      </div>

      <!-- Stats Cards / Widget Grid -->
      <div class="widget-grid">
          <div class="widget">
              <div class="widget-icon produk">
                  <!-- Ikon Box (Produk) -->
                  <svg class="icon-produk" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <h2>Total Produk</h2>
              <p class="stat-value" id="total-products"><?= $totalProducts ?></p>
          </div>
          <div class="widget">
              <div class="widget-icon stok">
                  <!-- Ikon Warning (Stok) -->
                  <svg class="icon-stok" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h2>Stok Menipis</h2>
              <p class="stat-value" id="low-stock"><?= $lowStockProducts ?></p>
          </div>
          <div class="widget">
              <div class="widget-icon pending">
                  <!-- Ikon Jam (Pending) -->
                  <svg class="icon-pending" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h2>Pesanan Pending</h2>
              <p class="stat-value" id="pending-orders"><?= $pendingOrders ?></p>
          </div>
          <div class="widget">
              <div class="widget-icon pendapatan">
                  <!-- Ikon Rupiah (Pendapatan) -->
                  <svg class="icon-pendapatan" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <h2>Total Pendapatan</h2>
              <p class="stat-value" id="total-revenue">Rp <?= number_format($totalRevenue, 0, ',', '.') ?></p>
          </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-grid">
        <a href="/seller/kelola_produk.php" class="action-card">
          <div class="action-card-icon">
            <!-- Ikon Edit -->
            <svg class="icon-edit" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </div>
          <div class="action-card-text">
            <h3>Kelola Produk</h3>
            <p>Ubah, hapus, dan lihat stok produk Anda.</p>
          </div>
        </a>
        <a href="/seller/tambah_produk.php" class="action-card">
          <div class="action-card-icon tambah">
            <!-- Ikon Tambah (+) -->
            <svg class="icon-tambah" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <div class="action-card-text">
            <h3>Tambah Produk Baru</h3>
            <p>Tambahkan produk baru ke toko Anda.</p>
          </div>
        </a>
        <a href="/seller/order_management.php" class="action-card">
          <div class="action-card-icon order">
            <!-- Ikon Order -->
            <svg class="icon-order" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
          </div>
          <div class="action-card-text">
            <h3>Lihat Pesanan</h3>
            <p>Kelola pesanan yang masuk ke toko Anda.</p>
          </div>
        </a>
      </div>
    </div>

  <!-- Toast Notification -->
  <div id="toast" class="toast"></div>
  
  <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
  <script>
    var quill = new Quill('#editor', {
      theme: 'snow',
      placeholder: 'Tulis deskripsi toko...'
    });

    // Set value ke input hidden sebelum submit
    document.getElementById('editStoreForm').addEventListener('submit', function(e) {
      document.getElementById('storeDescription').value = quill.root.innerHTML;
    });
  </script>
  <script src="/assets/js/sellerDashboard.js"></script>
  </body>
</html>