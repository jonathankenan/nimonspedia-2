<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/models/product.php');
require_once(__DIR__ . '/../../app/controllers/productController.php');

use App\Controllers\ProductController;

$productId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($productId <= 0) {
    http_response_code(400);
    echo 'Invalid product id';
    exit;
}

$controller = new ProductController($conn);
$data = $controller->getDetailData($productId);
if (!$data) {
    http_response_code(404);
    echo 'Product not found';
    exit;
}

$product = $data['product'];
$categories = $data['categories'];
$role = $_SESSION['role'] ?? null;

function sanitize_description($html) {
    return strip_tags($html ?? '', '<p><ul><ol><li><b><i><strong><em><br>');
}
?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($product['product_name']) ?> - Detail Produk</title>
    <link rel="stylesheet" href="/assets/css/productDetail.css">
    <script src="/assets/js/productDetail.js" defer></script>
  </head>
  <body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>

    <div class="container product-detail" data-product-id="<?= (int)$product['product_id'] ?>" data-max-stock="<?= (int)$product['stock'] ?>">
      <div class="image">
        <img loading="lazy" src="<?= htmlspecialchars($product['main_image_path'] ?: '../assets/images/default.png') ?>" alt="<?= htmlspecialchars($product['product_name']) ?>">
      </div>
      <div class="info">
        <h1><?= htmlspecialchars($product['product_name']) ?></h1>
        <div class="price">Rp <?= number_format((int)$product['price'], 0, ',', '.') ?></div>
        <div class="stock <?= ((int)$product['stock'] === 0) ? 'out' : 'in' ?>">
            <?= ((int)$product['stock'] === 0) ? 'Stok Habis' : 'Stok: ' . (int)$product['stock'] ?>
        </div>

        <div class="categories">
          <?php foreach ($categories as $cat): ?>
            <span class="chip"><?= htmlspecialchars($cat) ?></span>
          <?php endforeach; ?>
        </div>

        <div class="description">
          <?= sanitize_description($product['description']) ?>
        </div>

        <div class="store">
          <a class="store-name" href="/store/detail.php?id=<?= (int)$product['store_id'] ?>"><?= htmlspecialchars($product['store_name']) ?></a>
          <br>
          <?= sanitize_description($product['store_description']) ?>
        </div>

        <?php if ((int)$product['stock'] > 0): ?>
        <div class="add-to-cart">
          <div class="qty">
            <button type="button" id="qty-minus">-</button>
            <input type="number" id="qty-input" min="1" value="1">
            <button type="button" id="qty-plus">+</button>
          </div>
          <?php if ($role === 'BUYER'): ?>
            <button type="button" id="btn-add">Tambah ke Keranjang</button>
          <?php else: ?>
            <a class="btn-secondary" href="/authentication/login.php">Login untuk menambahkan ke keranjang</a>
          <?php endif; ?>
        </div>
        <?php endif; ?>
      </div>
    </div>

    <div id="toast" class="toast" hidden></div>
  </body>
</html>


