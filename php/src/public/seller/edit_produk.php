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
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Edit Produk</title>
    <link rel="stylesheet" href="../assets/css/editProduk.css">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    <div class="container">
        <div class="header">
            <h1>Edit Produk</h1>
        </div>

        <form id="editProductForm" class="product-edit-form" method="POST" enctype="multipart/form-data">
            <input type="hidden" name="productId" value="<?= htmlspecialchars($productId) ?>">
            <div class="product-image-section">
                <div class="product-image">
                    <img id="productImagePreview" src="<?= htmlspecialchars($product['main_image_path']) ?>" alt="Gambar Produk">
                </div>
                <div class="image-controls">
                    <label for="productImage" class="upload-image-btn">Ubah Foto</label>
                    <input type="file" id="productImage" name="productImage" accept="image/*" style="display: none;">
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="upload-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <span class="progress-text">Mengupload... 0%</span>
            </div>

            <div class="form-fields-container">
                <div class="form-group">
                    <label for="productName">Nama Produk*</label>
                    <input type="text" id="productName" name="productName" value="<?= htmlspecialchars($product['product_name']) ?>" required>
                </div>

                <div class="form-group">
                    <label for="editor">Deskripsi Produk*</label>
                    <div id="editor" style="height:150px;"><?= $product['description'] ?? '' ?></div>
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
                            <option value="<?= htmlspecialchars($category['category_id']) ?>"
                                <?= in_array($category['category_id'], $productCategories) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($category['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <button type="submit" id="submitButton" class="save-button">Simpan Perubahan</button>
            </div>
        </form>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="toast"></div>

        <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
        <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
        <script>
            var quill = new Quill('#editor', {
                theme: 'snow',
                placeholder: 'Tulis deskripsi produk...'
            });
            document.getElementById('editProductForm').addEventListener('submit', function(e) {
                document.getElementById('productDescription').value = quill.root.innerHTML;
            });
        </script>
        <script src="/assets/js/editProduk.js"></script>
</body>
</html>