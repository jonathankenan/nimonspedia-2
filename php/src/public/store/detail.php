<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/utils/pagination.php');
require_once(__DIR__ . '/../../app/models/product.php');
require_once(__DIR__ . '/../../app/controllers/storeController.php');
require_once(__DIR__ . '/../../app/utils/imageHandler.php');

use App\Controllers\StoreController;
use App\Utils\ImageHandler;

// $role = $_SESSION['role'] ?? null;

$storeId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($storeId <= 0) { http_response_code(400); echo 'Invalid store id'; exit; }

$filters = [
    'category' => $_GET['category'] ?? '',
    'search' => $_GET['search'] ?? '',
    'min_price' => $_GET['min_price'] ?? '',
    'max_price' => $_GET['max_price'] ?? ''
];
$page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : 1;
$perPage = 10;

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
    <link rel="stylesheet" href="/assets/css/productCard.css">
    <link rel="stylesheet" href="/assets/css/pagination.css">
    <link rel="stylesheet" href="/assets/css/filter.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    
    <script src="/assets/js/storeDetail.js" defer></script>
  </head>
  <body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    <div class="container">
      <div class="store-header">
        <img class="logo" src="<?= htmlspecialchars($store['store_logo_path'] ?: '/assets/images/logo.png') ?>" alt="logo">
        <div>
          <h1><?= htmlspecialchars($store['store_name']) ?></h1>
          <p><?= $store['store_description'] ?? '' ?></p>
        </div>
      </div>

      <div class="filters">
        <input type="text" id="search" placeholder="Cari produk..." value="<?= htmlspecialchars($_GET['search'] ?? '') ?>">
        <input type="number" id="min_price" placeholder="Min" value="<?= htmlspecialchars($_GET['min_price'] ?? '') ?>">
        <input type="number" id="max_price" placeholder="Max" value="<?= htmlspecialchars($_GET['max_price'] ?? '') ?>">
        <button id="filter-btn">Filter</button>
      </div>

      <div class="product-grid">
          <?php if (empty($products)): ?>
              <p class="empty-state">Belum ada produk di toko ini.</p>
          <?php else: ?>
              <?php foreach ($products as $p): 
                  $p['main_image_path'] = ImageHandler::ensureImagePath($p['main_image_path'], '/assets/images/default-product.png');
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
                        
                        <p class="stock-info">
                            <?= $outOfStock ? 'Stok Habis' : 'Stok: ' . htmlspecialchars($p['stock']) ?>
                        </p>

                        <?php if ($outOfStock): ?>
                          <span class="stock-label">Stok Habis</span>
                        <?php elseif ($role === 'BUYER'): ?>
                          <form action="/buyer/cart.php?action=add" method="POST">
                            <input type="hidden" name="product_id" value="<?= $p['product_id'] ?>">
                            <button type="submit" class="btn">Tambah ke Keranjang</button>
                          </form>
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


