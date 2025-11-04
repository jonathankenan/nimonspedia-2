<?php
session_start();

if (!isset($_SESSION['role'])) {
    header('Location: /authentication/register_role.php');
    exit();
}

require_once __DIR__ . '/../../app/config/db.php';
require_once __DIR__ . '/../../app/models/user.php';
require_once __DIR__ . '/../../app/controllers/registerController.php';

use App\Controllers\RegisterController;

$role = $_SESSION['role'];
$role_display = htmlspecialchars(ucfirst(strtolower($role)));

$error_message = '';
if (isset($_GET['error'])) {
    switch ($_GET['error']) {
        case 'empty_fields':
            $error_message = 'Harap isi semua kolom yang diperlukan.';
            break;
        case 'seller_fields_required':
            $error_message = 'Semua data toko wajib diisi untuk akun penjual.';
            break;
        case 'invalid_logo_type':
            $error_message = 'Format logo tidak valid. Gunakan JPG, PNG, atau WEBP.';
            break;
        case 'upload_folder_missing':
            $error_message = 'Folder upload tidak ditemukan di server.';
            break;
        case 'upload_failed':
            $error_message = 'Gagal mengunggah logo toko.';
            break;
        case 'exists':
            $error_message = 'Email sudah terdaftar.';
            break;
        case 'registration_failed':
            $error_message = 'Terjadi kesalahan saat registrasi. Silakan coba lagi.';
            break;
        default:
            $error_message = 'Terjadi kesalahan tak dikenal.';
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new RegisterController($conn);
    $controller->register();
    exit;
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Daftar | Nimonspedia</title>

    <link rel="stylesheet" href="/assets/css/authentication.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">

    <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    <script src="/assets/js/quillEditor.js" defer></script>
    <script src="/assets/js/imagePreview.js" defer></script>
</head>
<body>
    <div class="login-container">
        
        <h1>Daftar sebagai <?= $role_display ?> Nimonspedia 🍌!</h1>

        <?php if (isset($_SESSION['error_message'])): ?>
            <p class="error-message"><?= $_SESSION['error_message']; ?></p>
            <?php unset($_SESSION['error_message']); ?>
        <?php endif; ?>

        <?php if (!empty($error_message)): ?>
            <p class="error-message"><?= htmlspecialchars($error_message) ?></p>
        <?php endif; ?>

        <form action="" method="POST" enctype="multipart/form-data">
            <input type="hidden" name="role" value="<?= htmlspecialchars($role); ?>">

            <label for="name">Nama Lengkap:</label>
            <input type="text" id="name" name="name" required>

            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>

            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
            
            <label for="confirmPassword">Konfirmasi Password:</label>
            <input type="password" id="confirmPassword" name="confirm_password" required>

            <small class="password-hint">
                Minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol.
            </small>

            <label for="address">Alamat Lengkap:</label>
            <textarea id="address" name="address" required></textarea>

            <?php if ($role === 'SELLER'): ?>
            <div id="sellerFields">
                <label for="store_name">Nama Toko:</label>
                <input type="text" id="store_name" name="store_name" maxlength="100" required>
                        
                <label for="editor">Deskripsi:</label>
                <div id="editor"></div>
                <input type="hidden" name="description" id="productDescription">

                <label for="store_logo_input">Logo Toko:</label>
                <div class="file-input-wrapper">
                    <label for="store_logo_input" class="file-upload-button">Pilih Foto</label>
                    <span class="file-help-text">Max. 2MB. Format: JPG, JPEG, PNG, WEBP</span>
                    <input type="file" name="store_logo" id="store_logo_input" accept="image/*" required>
                    <img id="store_logo_preview"/>
                </div>
            </div>
            <?php endif; ?>

            <button type="submit">Daftar</button>
            
            <p class="register-link">
                Sudah mempunyai akun? <a href="login.php">Masuk</a>
            </p>
        </form>
    </div>
</body>
</html>