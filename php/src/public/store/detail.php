<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/utils/pagination.php');
require_once(__DIR__ . '/../../app/models/product.php');
require_once(__DIR__ . '/../../app/controllers/storeController.php');

use App\Controllers\StoreController;

$storeId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($storeId <= 0) { http_response_code(400); echo 'Invalid store id'; exit; }

$filters = [
    'category' => $_GET['category'] ?? '',
    'search' => $_GET['search'] ?? '',
    'min_price' => $_GET['min_price'] ?? '',
    'max_price' => $_GET['max_price'] ?? ''
];
$page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : 1;
$perPage = 12;

$controller = new StoreController($conn);
$store = $controller->getStoreById($storeId);
if (!$store) { http_response_code(404); echo 'Store not found'; exit; }

$data = $controller->getStoreProducts($storeId, $filters, $page, $perPage);
$products = $data['products'];
$totalPages = $data['totalPages'];
?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($store['store_name']) ?> - Toko</title>
    <link rel="stylesheet" href="/assets/css/storeDetail.css">
    <script src="/assets/js/storeDetail.js" defer></script>
  </head>
  <body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    <div class="container">
      <div class="store-header">
        <img class="logo" src="<?= htmlspecialchars($store['store_logo_path'] ?: '/assets/images/logo.png') ?>" alt="logo">
        <div>
          <h1><?= htmlspecialchars($store['store_name']) ?></h1>
          <p><?= htmlspecialchars($store['store_description'] ?? '') ?></p>
        </div>
      </div>

      <div class="filters">
        <input type="text" id="search" placeholder="Cari produk..." value="<?= htmlspecialchars($_GET['search'] ?? '') ?>">
        <input type="number" id="min_price" placeholder="Min" value="<?= htmlspecialchars($_GET['min_price'] ?? '') ?>">
        <input type="number" id="max_price" placeholder="Max" value="<?= htmlspecialchars($_GET['max_price'] ?? '') ?>">
        <button id="filter-btn">Filter</button>
      </div>

      <div class="product-grid">
        <?php if($products->num_rows === 0): ?>
          <p class="empty-state">Produk tidak ditemukan.</p>
        <?php else: ?>
          <?php while ($p = $products->fetch_assoc()): $out = $p['stock'] == 0; ?>
          <div class="product-card <?= $out ? 'out-of-stock' : '' ?>">
              <a href="/buyer/product.php?id=<?= (int)$p['product_id'] ?>">
                <img loading="lazy" src="<?= htmlspecialchars($p['main_image_path'] ?: '/assets/images/default-product.png') ?>" alt="<?= htmlspecialchars($p['product_name']) ?>">
              </a>
              <a class="product-name" href="/buyer/product.php?id=<?= (int)$p['product_id'] ?>"><?= htmlspecialchars($p['product_name']) ?></a>
              <p>Rp <?= number_format((int)$p['price'], 0, ',', '.') ?></p>
              <p class="seller-name"><a href="/store/detail.php?id=<?= (int)$store['store_id'] ?>"><?= htmlspecialchars($store['store_name']) ?></a></p>
              <p class="stock-info"><?= $out ? 'Stok Habis' : 'Stok: ' . (int)$p['stock'] ?></p>
          </div>
          <?php endwhile; ?>
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


