<?php

require_once(__DIR__ . '/../app/utils/session.php');
require_once(__DIR__ . '/../app/config/db.php');
require_once(__DIR__ . '/../app/utils/pagination.php');
require_once(__DIR__ . '/../app/models/product.php');
require_once(__DIR__ . '/../app/controllers/buyerController.php');

if (session_status() === PHP_SESSION_NONE) {
  session_start();
}
$role = $_SESSION['role'] ?? 'GUEST';
$buyerId = ($role === 'BUYER') ? ($_SESSION['user_id'] ?? null) : null;

if ($role === 'SELLER') {
  header("Location: /seller/dashboard.php");
  exit;
}

use App\Models\Product;
use App\Controllers\BuyerController;  

$productModel = new Product($conn);
$controller = new BuyerController($conn);

$filters = [
  'category' => $_GET['category'] ?? '',
  'search' => $_GET['search'] ?? '',
  'min_price' => $_GET['min_price'] ?? '',
  'max_price' => $_GET['max_price'] ?? ''
];

$page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : 1;
$perPage = 10;

$data = $controller->getDashboardData($buyerId, $filters, $page, $perPage);

$products = $data['products'];
$totalPages = $data['totalPages'];
$categories = $productModel->getAllCategories();
?>
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8">
  <title>Nimonspedia - Selamat Datang!</title>
  <link rel="stylesheet" href="/assets/css/buyerDashboard.css">
  <link rel="stylesheet" href="/assets/css/pagination.css">
  <link rel="stylesheet" href="/assets/css/productCard.css">
  <link rel="stylesheet" href="/assets/css/filter.css">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
  <script src="/assets/js/search.js" defer></script>
  <script src="/assets/js/filter.js" defer></script>
  </head>
  <body>
  <?php include_once(__DIR__ . '/../app/components/navbar.php'); ?>

    <div class="container">
      
      <div class="welcome-header">
        <h1>
          <?php if ($role === 'BUYER'): ?>
            Cari Produk di <i>Nimonspedia</i>!
          <?php else: ?>
            Selamat Datang di <i>Nimonspedia</i> 🍌!
          <?php endif; ?>
        </h1>
        <p>
          <?php if ($role === 'BUYER'): ?>
            Temukan berbagai produk menarik dan berkualitas dari penjual terpercaya.
          <?php else: ?>
            Temukan berbagai produk menarik dan berkualitas dari toko-toko kepercayaan kami.
          <?php endif; ?>
        </p>
      </div>

      <div class="filters">
        <input type="text" id="search" placeholder="Cari produk" value="<?= htmlspecialchars($_GET['search'] ?? '') ?>">
        <select id="category">
          <option value="">Semua Kategori</option>
          <?php foreach($categories as $cat): 
            $selected = (isset($_GET['category']) && $_GET['category']==$cat) ? 'selected' : '';
          ?>
            <option value="<?= htmlspecialchars($cat) ?>" <?= $selected ?>><?= htmlspecialchars($cat) ?></option>
          <?php endforeach; ?>
        </select>
        <input type="number" id="min_price" placeholder="Min" value="<?= htmlspecialchars($_GET['min_price'] ?? '') ?>">
        <input type="number" id="max_price" placeholder="Max" value="<?= htmlspecialchars($_GET['max_price'] ?? '') ?>">
        <button id="filter-btn">Filter</button>
      </div>

      <div class="product-grid" id="product-grid">
      <?php if (empty($products)): ?>
        <p class="empty-state">Produk tidak ditemukan.</p>
      <?php else: ?>
        <?php foreach ($products as $p): 
          $outOfStock = $p['stock'] == 0;
        ?>
        <div class="product-card <?= $outOfStock ? 'out-of-stock' : '' ?>">
            <a href="/buyer/product.php?id=<?= (int)$p['product_id'] ?>" class="card-image-link">
              <img loading="lazy" 
                  src="<?= htmlspecialchars($p['main_image_path']) ?>" 
                  alt="<?= htmlspecialchars($p['product_name']) ?>">
            </a>
            <div class="card-content">
              <h3><a href="/buyer/product.php?id=<?= (int)$p['product_id'] ?>">
                <?= htmlspecialchars($p['product_name']) ?>
              </a></h3>
              <p class="price">Rp <?= number_format($p['price'], 0, ',', '.') ?></p>
              <p class="seller-name">
                <a href="/store/detail.php?id=<?= (int)$p['store_id'] ?>">
                  <?= htmlspecialchars($p['store_name'] ?? 'Toko Tidak Diketahui') ?>
                </a>
              </p>
              <p class="stock-info">
                  <?= $outOfStock ? 'Stok Habis' : 'Stok: ' . htmlspecialchars($p['stock']) ?>
              </p>

              <?php if ($role === 'BUYER' && !$outOfStock): ?>
                <form action="/buyer/cart.php?action=add" method="POST">
                  <input type="hidden" name="product_id" value="<?= $p['product_id'] ?>">
                  <button type="submit" class="btn">Tambah ke Keranjang</button>
                </form>
              <?php elseif ($outOfStock): ?>
                <span class="stock-label">Stok Habis</span>
              <?php else: ?>
                <a href="/authentication/login.php" class="btn btn-secondary">Masuk untuk Membeli</a>
              <?php endif; ?>
            </div>
        </div>
        <?php endforeach; ?>
      <?php endif; ?>
      </div>

      <div class="pagination">
        <?php for ($i = 1; $i <= $totalPages; $i++): ?>
          <a href="?<?= http_build_query(array_merge($_GET, ['page'=>$i])) ?>" class="<?= $i == $page ? 'active' : '' ?>"><?= $i ?></a>
        <?php endfor; ?>
      </div>
    </div>
  </body>
</html>