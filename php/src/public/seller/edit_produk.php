<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/models/product.php');
require_once(__DIR__ . '/../../app/models/category.php');

use App\Models\Product;
use App\Models\Category;

requireRole('SELLER');

$productId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Initialize models
$productModel = new Product($conn);
$categoryModel = new Category($conn);

// Get product data
try {
    $product = $productModel->getProductById($productId);
    $categories = $categoryModel->getAll();
    $productCategories = $product['category_ids'] ?? [];
} catch (\Exception $e) {
    // Redirect to kelola produk if product not found
    header('Location: /seller/kelola_produk.php');
    exit;
}

if (!$product || $product['store_id'] !== $_SESSION['store_id']) {
    // Redirect if product not found or doesn't belong to seller
    header('Location: /seller/kelola_produk.php');
    exit;
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Edit Produk | <?= htmlspecialchars($product['product_name']) ?></title>
    
    <link rel="stylesheet" href="../assets/css/editProduk.css">
    <link rel="stylesheet" href="/assets/css/toast.css">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    <div class="form-container">
        <div class="header">
            <h1>Edit Produk</h1>
            <a href="/seller/kelola_produk.php" class="back-button">Kembali</a>
        </div>

        <form id="editProductForm" class="product-edit-form" method="POST" enctype="multipart/form-data">
            <input type="hidden" name="productId" value="<?= htmlspecialchars($productId) ?>">
            
            <!-- Kolom Kiri: Gambar -->
            <div class="product-image-section">
                <div class="product-image">
                    <img id="productImagePreview" src="<?= htmlspecialchars($product['main_image_path']) ?>" alt="Gambar Produk">
                </div>
                <div class="image-controls">
                    <label for="productImage" class="upload-image-btn">Ubah Foto</label>
                    <input type="file" id="productImage" name="productImage" accept="image/*">
                </div>
                <!-- Progress Bar -->
                <div class="upload-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <span class="progress-text">Mengubah... 0%</span>
                </div>
            </div>

            <!-- Kolom Kanan: Form Fields -->
            <div class="form-fields-container">
                <div class="form-group">
                    <label for="productName">Nama Produk*</label>
                    <input type="text" id="productName" name="productName" value="<?= htmlspecialchars($product['product_name']) ?>" required>
                </div>

                <div class="form-group">
                    <label for="editor">Deskripsi Produk*</label>
                    <div id="editor"><?= $product['description'] ?? '' ?></div>
                    <input type="hidden" name="productDescription" id="productDescription">
                </div>

                <div class="form-group">
                    <label for="productPrice">Harga (Rp)*</label>
                    <input type="number" id="productPrice" name="productPrice" value="<?= htmlspecialchars($product['price']) ?>" required min="0">
                </div>

                <div class="form-group">
                    <label for="productStock">Stok*</label>
                    <input type="number" id="productStock" name="productStock" value="<?= htmlspecialchars($product['stock']) ?>" required min="0">
                </div>

                <div class="form-group">
                    <label for="categories">Kategori*</label>
                    <select id="categories" name="categories[]" multiple required>
                        <?php foreach ($categories as $category): ?>
                            <option value="<?= htmlspecialchars($category['category_id']) ?>"<?= in_array($category['category_id'], $productCategories) ? ' selected' : '' ?>>
                                <?= htmlspecialchars($category['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <button type="submit" id="submitButton" class="save-button">Simpan</button>
            </div>
        </form>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="toast"></div>

    <!-- Quill JS -->
    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script>
        var quill = new Quill('#editor', {
            theme: 'snow',
            placeholder: 'Tulis deskripsi produk...'
        });
        
        var form = document.getElementById('editProductForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                var descriptionInput = document.getElementById('productDescription');
                if (descriptionInput) {
                    descriptionInput.value = quill.root.innerHTML;
                }
            });
        }
    </script>
    
    <script src="/assets/js/editProduk.js"></script>
</body>
</html>