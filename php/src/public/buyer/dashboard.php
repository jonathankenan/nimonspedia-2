<?php
include_once(__DIR__ . '/../../app/utils/session.php');
$role = $_SESSION['role'] ?? 'GUEST';

include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/utils/pagination.php');

// Pagination
$page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : 1;
$perPage = 12;

// Filter & Search
$where = ["p.deleted_at IS NULL"];
$join = "INNER JOIN stores s ON p.store_id = s.store_id";

// Category filter
if (!empty($_GET['category'])) {
    $cat = $conn->real_escape_string($_GET['category']);
    $join .= " INNER JOIN category_item ci ON p.product_id = ci.product_id
               INNER JOIN category c ON ci.category_id = c.category_id";
    $where[] = "c.name = '$cat'";
}

// Search
if (!empty($_GET['search'])) {
    $search = $conn->real_escape_string($_GET['search']);
    $where[] = "LOWER(p.product_name) LIKE LOWER('%$search%')";
}

// Price filter
if (!empty($_GET['min_price'])) {
    $min = (int)$_GET['min_price'];
    $where[] = "p.price >= $min";
}

if (!empty($_GET['max_price'])) {
    $max = (int)$_GET['max_price'];
    $where[] = "p.price <= $max";
}

$whereSQL = implode(' AND ', $where);

// Query products with pagination
$sql = "SELECT p.*, s.store_name, s.store_logo_path
        FROM products p
        $join
        WHERE $whereSQL
        ORDER BY p.created_at DESC";

$products = paginate($conn, $sql, $perPage, $page);
$totalPages = getTotalPages($conn, "($sql) AS sub", $perPage);

// Get all categories
$catRes = $conn->query("SELECT * FROM categories ORDER BY name ASC");
$categories = [];
while ($row = $catRes->fetch_assoc()) {
    $categories[] = $row['name'];
}
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Dashboard Buyer</title>
    <link rel="stylesheet" href="../assets/css/buyerDashboard.css">
    <script src="../assets/js/search.js" defer></script>
    <script src="../assets/js/filter.js" defer></script>
  </head>
  <body>
  <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    <div class="container">
      <h1>Product Discovery</h1>

      <!-- Search & Filters -->
      <div class="filters">
        <input type="text" id="search" placeholder="Cari produk..." value="<?= htmlspecialchars($_GET['search'] ?? '') ?>">

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

      <!-- Product Grid -->
      <div class="product-grid" id="product-grid">
        <?php if($products->num_rows === 0): ?>
          <p class="empty-state">Produk tidak ditemukan.</p>
        <?php else: ?>
          <?php while ($p = $products->fetch_assoc()): 
            $outOfStock = $p['stock'] == 0;
          ?>
            <div class="product-card <?= $outOfStock ? 'out-of-stock' : '' ?>">
              <img loading="lazy" src="<?= htmlspecialchars($p['main_image_path'] ?: '../assets/images/default-product.png') ?>" alt="Product Image">
              <h3><?= htmlspecialchars($p['product_name']) ?></h3>
              <p>Rp <?= number_format($p['price'], 0, ',', '.') ?></p>
              <p class="seller-name"><?= htmlspecialchars($p['store_name'] ?? 'Toko Tidak Diketahui') ?></p>

              <?php if ($outOfStock): ?>
                <span class="stock-label">Stok Habis</span>
              <?php elseif ($role === 'BUYER'): ?>
                <form action="/buyer/add_to_cart.php" method="POST">
                  <input type="hidden" name="product_id" value="<?= $p['product_id'] ?>">
                  <button type="submit" class="btn">Add to Cart</button>
                </form>
              <?php else: ?>
                <a href="/authentication/login.php" class="btn btn-secondary">Login untuk membeli</a>
              <?php endif; ?>
            </div>
          <?php endwhile; ?>
        <?php endif; ?>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <?php for ($i = 1; $i <= $totalPages; $i++): ?>
          <a href="?<?= http_build_query(array_merge($_GET, ['page'=>$i])) ?>" class="<?= $i == $page ? 'active' : '' ?>"><?= $i ?></a>
        <?php endfor; ?>
      </div>
    </div>
  </body>
</html>
