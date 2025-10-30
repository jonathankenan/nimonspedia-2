<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/models/product.php');
require_once(__DIR__ . '/../../app/controllers/productController.php');

use App\Models\Product;
use App\Controllers\ProductController;

requireRole('SELLER');

$page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : 1;
$perPage = 12;

$productModel = new Product($conn);
$data = $productModel->getProductsByStoreId($_SESSION['store_id'], $page, $perPage);
$products = $data['products'];
$totalPages = $data['totalPages'];

// Debug information
error_log("Page: " . $page);
error_log("Total Pages: " . $totalPages);
error_log("Number of products: " . count($products));
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Kelola Produk</title>
    <link rel="stylesheet" href="/assets/css/kelolaProduk.css">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    <div class="container">
        <div class="header">
            <h1>Kelola Produk</h1>
            <a href="/seller/tambah_produk.php" class="add-button">Tambah Produk</a>
        </div>

        <?php if (empty($products)): ?>
            <div class="empty-state">
                <img src="/assets/images/empty-products.png" alt="No products">
                <h2>Belum Ada Produk</h2>
                <p>Anda belum memiliki produk. Mulai dengan menambahkan produk pertama Anda.</p>
                <a href="/seller/tambah_produk.php" class="add-button">Tambah Produk Sekarang</a>
            </div>
        <?php else: ?>
            <div class="product-list">
                <?php if (is_array($products)): ?>
                    <?php foreach ($products as $product): ?>
                        <div class="product-card" data-product-id="<?= htmlspecialchars($product['product_id']) ?>">
                            <img src="<?= htmlspecialchars($product['main_image_path']) ?>" alt="<?= htmlspecialchars($product['product_name']) ?>">
                            <div class="product-info">
                                <h3><?= htmlspecialchars($product['product_name']) ?></h3>
                                <p class="price">Rp <?= number_format($product['price'], 0, ',', '.') ?></p>
                                <p class="stock">Stok: <?= htmlspecialchars($product['stock']) ?></p>
                            </div>
                            <div class="actions">
                                <a href="/seller/edit_produk.php?id=<?= htmlspecialchars($product['product_id']) ?>" class="edit-button">Edit</a>
                                <button onclick="confirmDelete(<?= htmlspecialchars($product['product_id']) ?>)" class="delete-button">Hapus</button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <!-- Pagination -->
            <div class="pagination">
                <?php if ($page > 1): ?>
                    <a href="?page=<?= $page - 1 ?>">&laquo; Previous</a>
                <?php endif; ?>
                
                <?php
                $start = max(1, $page - 2);
                $end = min($totalPages, $page + 2);
                
                if ($start > 1): ?>
                    <a href="?page=1">1</a>
                    <?php if ($start > 2): ?>
                        <span>...</span>
                    <?php endif; ?>
                <?php endif; ?>
                
                <?php for ($i = $start; $i <= $end; $i++): ?>
                    <a href="?page=<?= $i ?>" class="<?= $i == $page ? 'active' : '' ?>"><?= $i ?></a>
                <?php endfor; ?>
                
                <?php if ($end < $totalPages): ?>
                    <?php if ($end < $totalPages - 1): ?>
                        <span>...</span>
                    <?php endif; ?>
                    <a href="?page=<?= $totalPages ?>"><?= $totalPages ?></a>
                <?php endif; ?>
                
                <?php if ($page < $totalPages): ?>
                    <a href="?page=<?= $page + 1 ?>">Next &raquo;</a>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal">
        <div class="modal-content">
            <h2>Konfirmasi Hapus</h2>
            <p>Apakah Anda yakin ingin menghapus produk ini?</p>
            <div class="modal-actions">
                <button id="confirmDelete" class="confirm-button">Ya, Hapus</button>
                <button id="cancelDelete" class="cancel-button">Batal</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="toast"></div>

    <script src="/assets/js/kelolaProduk.js"></script>
</body>
