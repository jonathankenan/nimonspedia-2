<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/models/product.php');
require_once(__DIR__ . '/../../app/models/feature.php');
require_once(__DIR__ . '/../../app/controllers/productController.php');

use App\Models\Product;
use App\Models\Feature;
use App\Controllers\ProductController;

requireRole('SELLER');

$page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : 1;
$perPage = 10;

$productModel = new Product($conn);
$data = $productModel->getProductsByStoreId($_SESSION['store_id'], $page, $perPage);
$products = $data['products'];
$totalPages = $data['totalPages'];

// Check auction feature flag
$featureModel = new Feature($conn);
$auction_access = $featureModel->checkAccess($_SESSION['user_id'], 'auction_enabled');
$auction_enabled = $auction_access['allowed'];
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kelola Produk</title>
    <link rel="stylesheet" href="/assets/css/kelolaProduk.css">
    <link rel="stylesheet" href="/assets/css/pagination.css">
    <link rel="stylesheet" href="/assets/css/toast.css">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    <div class="container">
        <div class="header">
            <h1>Kelola Produk Toko Anda</h1>
            <a href="/seller/tambah_produk.php" class="add-button">Tambah Produk</a>
        </div>

        <?php if (empty($products)): ?>
            <div class="empty-state">
                <h2>Belum Ada Produk</h2>
                <p>Anda belum memiliki produk. Mulai dengan menambahkan produk pertama Anda.</p>
                <!-- <a href="/seller/tambah_produk.php" class="add-button">Tambah Produk Sekarang</a> -->
            </div>
        <?php else: ?>
            <div class="product-list">
                <?php if (is_array($products)): ?>
                    <?php foreach ($products as $product): ?>
                        <?php
                            $imagePath = $product['main_image_path'];
                            $fullPath = $_SERVER['DOCUMENT_ROOT'] . $imagePath;

                            if (!file_exists($fullPath) || !is_file($fullPath)) {
                                $imagePath = '/assets/images/default.png';
                            }
                        ?>
                        <div class="product-card" data-product-id="<?= htmlspecialchars($product['product_id']) ?>">
                            <a href="/seller/edit_produk.php?id=<?= htmlspecialchars($product['product_id']) ?>" class="card-image-link">
                                <img src="<?= htmlspecialchars($imagePath) ?>" alt="<?= htmlspecialchars($product['product_name']) ?>">
                                <?php if (!empty($product['auction_status'])): ?>
                                    <span class="badge-auction">DALAM LELANG</span>
                                <?php endif; ?>
                            </a>
                            <div class="product-info">
                                <h3><a href="/seller/edit_produk.php?id=<?= htmlspecialchars($product['product_id']) ?>"><?= htmlspecialchars($product['product_name']) ?></a></h3>
                                <p class="price">Rp <?= number_format($product['price'], 0, ',', '.') ?></p>
                                <p class="stock">Stok: <?= htmlspecialchars($product['stock']) ?></p>
                            </div>
                            <div class="actions">
                                <?php if (!empty($product['auction_status'])): ?>
                                    <button class="edit-button" disabled style="opacity: 0.5; cursor: not-allowed;">Edit</button>
                                    <button class="delete-button" disabled style="opacity: 0.5; cursor: not-allowed;">Hapus</button>
                                    <?php if ($auction_enabled): ?>
                                        <a href="/auction/<?= htmlspecialchars($product['auction_id']) ?>" class="auction-button" style="background-color: #f59e0b; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 0.9rem;">Lihat Lelang</a>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <a href="/seller/edit_produk.php?id=<?= htmlspecialchars($product['product_id']) ?>" class="edit-button">Edit</a>
                                    <button onclick="confirmDelete(<?= htmlspecialchars($product['product_id']) ?>)" class="delete-button">Hapus</button>
                                    <?php if ($product['stock'] > 0): ?>
                                        <?php if ($auction_enabled): ?>
                                            <a href="/admin/seller/auction/create?productId=<?= htmlspecialchars($product['product_id']) ?>" class="auction-button" style="background-color: #0A75BD; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 0.9rem;">Jadikan Lelang</a>
                                        <?php else: ?>
                                            <a href="/disabled.php?reason=<?= urlencode($auction_access['reason'] ?? 'Fitur lelang sedang dinonaktifkan') ?>" class="auction-button" style="background-color: #0A75BD; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 0.9rem;">Jadikan Lelang</a>
                                        <?php endif; ?>
                                    <?php endif; ?>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <!-- Pagination -->
            <div class="pagination">
                <?php if ($page > 1): ?>
                    <a href="?page=<?= $page - 1 ?>">&laquo;</a>
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
                    <a href="?page=<?= $page + 1 ?>">&raquo;</a>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal">
        <div class="modal-content">
            <h3>Konfirmasi Penghapusan</h3>
            <p>Apakah Anda yakin ingin menghapus produk ini?</p>
            <div class="modal-actions">
                <button id="confirmDelete" class="btn btn-danger">Ya, Hapus</button>
                <button id="cancelDelete" class="btn btn-secondary">Batal</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="toast"></div>

    <script src="/assets/js/kelolaProduk.js"></script>
</body>
</html>