<?php
include_once(__DIR__ . '/../../app/utils/session.php');
requireLogin();
requireRole('BUYER');
include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/utils/pagination.php');
include_once(__DIR__ . '/../../app/components/navbar.php');

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$perPage = 12;

$products = paginate($conn, "SELECT * FROM products WHERE deleted_at IS NULL", $perPage, $page);
$totalPages = getTotalPages($conn, 'products', $perPage);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard Buyer</title>
  <link rel="stylesheet" href="../assets/css/buyerDashboard.css">
</head>
<body>

  <div class="product-grid">
    <?php while ($p = $products->fetch_assoc()): ?>
      <div class="product-card">
        <img src="<?= htmlspecialchars($p['main_image_path']) ?>" alt="Product Image">
        <h3><?= htmlspecialchars($p['product_name']) ?></h3>
        <p>Rp <?= number_format($p['price'], 0, ',', '.') ?></p>
        <button>Add to Cart</button>
      </div>
    <?php endwhile; ?>
  </div>

  <div class="pagination">
    <?php for ($i = 1; $i <= $totalPages; $i++): ?>
      <a href="?page=<?= $i ?>" class="<?= $i == $page ? 'active' : '' ?>"><?= $i ?></a>
    <?php endfor; ?>
  </div>
</body>
</html>
