<?php
require_once(__DIR__ . '/../../app/utils/session.php');
require_once(__DIR__ . '/../../app/config/db.php');
require_once(__DIR__ . '/../../app/models/category.php');

use App\Models\Category;

requireRole('SELLER');

$categoryModel = new Category($conn);
$categories = $categoryModel->getAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tambah Produk</title>
    <link rel="stylesheet" href="/assets/css/tambahProduk.css">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    <div class="container">
        <div class="header">
            <h1>Tambah Produk Baru</h1>
            <a href="/seller/kelola_produk.php" class="back-button">Kembali</a>
        </div>

        <form id="addProductForm" class="product-form" enctype="multipart/form-data">
            <div class="form-group">
                <label for="productName">Nama Produk*</label>
                <input type="text" id="productName" name="productName" maxlength="200" required>
                <small class="char-counter">0/200</small>
            </div>

            <div class="form-group">
                <label for="productDescription">Deskripsi Produk*</label>
                <textarea id="productDescription" name="description" maxlength="1000" required></textarea>
                <small class="char-counter">0/1000</small>
            </div>

            <div class="form-group">
                <label for="categories">Kategori*</label>
                <select id="categories" name="categories[]" multiple required>
                    <?php foreach ($categories as $category): ?>
                        <option value="<?= htmlspecialchars($category['category_id']) ?>">
                                <?= htmlspecialchars($category['name']) ?>
                            </option>
                    <?php endforeach; ?>
                </select>
            </div>
            

            <div class="form-group">
                <label for="price">Harga (Rp)*</label>
                <input type="number" id="price" name="price" min="1000" required>
            </div>

            <div class="form-group">
                <label for="stock">Stok*</label>
                <input type="number" id="stock" name="stock" min="0" required>
            </div>

            <div class="form-group">
                <label for="productImage">Foto Produk*</label>
                <div class="image-upload-container">
                    <div class="preview-container" style="display: none;">
                        <img id="imagePreview">
                    </div>
                    <div class="upload-controls">
                        <label for="productImage" class="btn btn-primary">Pilih Foto</label>
                        <input type="file" id="productImage" name="productImage" accept="image/jpg,image/jpeg,image/png,image/webp" style="display: none;" required>
                    </div>
                    <small class="file-info">Max: 2MB. Format: JPG, JPEG, PNG, WEBP</small>
                </div>
            </div>

            <div class="upload-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <span class="progress-text">Mengupload... 0%</span>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary" id="submitButton">Tambah Produk</button>
            </div>
        </form>
    </div>

    <div id="toast" class="toast" style="display: none;"></div>

    <script src="/assets/js/tambahProduk.js"></script>
</body>
</html>