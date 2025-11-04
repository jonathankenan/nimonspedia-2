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
    <title><?= htmlspecialchars($product['product_name']) ?> - Detail Produk</title>
    <link rel="stylesheet" href="/assets/css/productDetail.css">
    <link rel="stylesheet" href="/assets/css/toast.css">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    
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
        <h3 class="cart-label">Masukkan Keranjang</h3>
        <form class="add-to-cart" action="/buyer/cart.php?action=add" method="POST">
          <div class="qty">
            <button type="button" id="qty-minus">-</button>
            <input type="number" id="qty-input" name="quantity" min="1" value="1">
            <button type="button" id="qty-plus">+</button>
          </div>
          <input type="hidden" name="product_id" value="<?= (int)$product['product_id'] ?>">
          <?php if ($role === 'BUYER'): ?>
            <button type="submit" class="btn">Tambah ke Keranjang</button>
          <?php else: ?>
            <a class="btn-secondary" href="/authentication/login.php">Masuk untuk Menambahkan ke Keranjang</a>
          <?php endif; ?>
        </form>
        <?php endif; ?>
      </div>
    </div>

    <div id="toast" class="toast" hidden></div>
  </body>
</html>


