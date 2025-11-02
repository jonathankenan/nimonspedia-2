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
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Tambah Produk</title>
    <link rel="stylesheet" href="/assets/css/tambahProduk.css">
    <link rel="stylesheet" href="/assets/css/toast.css">
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
</head>
<body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>
    
    <div class="form-container">
        
        <h1>Tambah Produk Baru</h1>

        <form id="addProductForm" class="product-form" method="POST" enctype="multipart/form-data">
            
            <label for="productName">Nama Produk:</label>
            <input type="text" id="productName" name="productName" maxlength="200" required>

            <label for="editor">Deskripsi Produk:</label>
            <div id="editor" style="height:150px;"></div>
            <input type="hidden" name="description" id="productDescription">

            <label for="category">Kategori:</label>
            <select id="category" name="category_id" required>
                <option value="" disabled selected>Pilih satu kategori</option>
                <?php foreach ($categories as $category): ?>
                    <option value="<?= htmlspecialchars($category['category_id']) ?>">
                            <?= htmlspecialchars($category['name']) ?>
                        </option>
                <?php endforeach; ?>
            </select>

            <label for="price">Harga (Rp):</label>
            <input type="number" id="price" name="price" min="1000" required>

            <label for="stock">Stok:</label>
            <input type="number" id="stock" name="stock" min="0" required>

            <label for="productImage">Foto Produk:</label>
            <div class="file-input-wrapper">
                <label for="productImage_input" class="file-upload-button">Pilih Foto</label>
                <span class="file-help-text">Max. 2MB. Format: JPG, JPEG, PNG, WEBP</span>
                <input type="file" id="productImage_input" name="productImage" accept="image/jpg,image/jpeg,image/png,image/webp" required>
            </div>

            <div class="form-actions">
                <button type="submit" id="submitButton">Tambah Produk</button>
            </div>
        </form>
    </div>

    <div id="toast" class="toast"></div>

    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script>
        var quill = new Quill('#editor', {
            theme: 'snow',
            placeholder: 'Tulis deskripsi produk...'
        });
        
        var form = document.getElementById('addProductForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                var descriptionInput = document.getElementById('productDescription');
                if (descriptionInput) {
                    descriptionInput.value = quill.root.innerHTML;
                }
            });
        }
    </script>
    
    <script src="/assets/js/tambahProduk.js"></script>
</body>
</html>