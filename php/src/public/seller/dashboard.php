<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/models/store.php');

use App\Models\Store;

requireRole('SELLER');

$name = $_SESSION['name'] ?? 'Penjual';
$balance = $_SESSION['balance'] ?? 0;

$storeModel = new Store($conn);
$store = $storeModel->getById($_SESSION['store_id']);

?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Dashboard Seller</title>
  <link rel="stylesheet" href="/assets/css/sellerDashboard.css">
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  </head>
  <body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    <div class="container">
      <h1>Selamat Datang, <?= htmlspecialchars($name) ?>!</h1>

      <!-- Store Info Editable -->
      <div class="store-info">
        <h2>Informasi Toko Anda</h2>
        <form id="editStoreForm" class="store-edit-form" method="POST" enctype="multipart/form-data">
          <div class="store-logo-section">
            <div class="store-logo">
              <img id="storeLogoPreview" src="<?= htmlspecialchars($store['store_logo_path']) ?>" alt="Logo Toko">
            </div>
            <div class="logo-controls">
              <label for="storeLogo" class="upload-logo-btn">Ubah Logo</label>
              <input type="file" id="storeLogo" name="storeLogo" accept="image/*" style="display: none;">
            </div>
          </div>
          <div class="form-fields-container">
            <div class="form-group">
              <label for="storeName">Nama Toko</label>
              <input type="text" id="storeName" name="storeName" value="<?= htmlspecialchars($store['store_name'] ?? '') ?>" required>
            </div>
            <div class="form-group">
              <label for="editor">Deskripsi Toko</label>
              <div id="editor" style="height:150px;"><?= $store['store_description'] ?? '' ?></div>
              <input type="hidden" name="storeDescription" id="storeDescription">
            </div>
            <button type="submit" class="save-button">Simpan Perubahan</button>
          </div>
        </form>
        <p class="store-balance">Saldo Toko: Rp <?= number_format($store['balance'] ?? 0, 0, ',', '.') ?></p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-container">
        <div class="stat-card">
          <h3>Total Produk</h3>
          <div class="stat-value" id="total-products">-</div>
        </div>
        <div class="stat-card">
          <h3>Stok Menipis</h3>
          <div class="stat-value" id="low-stock">-</div>
        </div>
        <div class="stat-card">
          <h3>Pesanan Pending</h3>
          <div class="stat-value" id="pending-orders">-</div>
        </div>
        <div class="stat-card">
          <h3>Total Pendapatan</h3>
          <div class="stat-value" id="total-revenue">-</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <a href="/seller/kelola_produk.php" class="action-button">Kelola Produk</a>
        <a href="/seller/tambah_produk.php" class="action-button">Tambah Produk Baru</a>
        <a href="/seller/order_management.php" class="action-button">Lihat Pesanan</a>
      </div>
    </div>

  <!-- Toast Notification -->
  <div id="toast" class="toast"></div>
  <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
  <script>
    // Inisialisasi Quill editor
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