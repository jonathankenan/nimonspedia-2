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

// Jika form disubmit (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new RegisterController($conn);
    $controller->register();
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Daftar | Nimonspedia</title>
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/password.css">
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">

    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
    <script src="/assets/js/quillEditor.js" defer></script>
    <script src="/assets/js/register.js" defer></script>
</head>
<body>
    <div class="container">
        <h2>Daftar Akun Nimonspedia (Sebagai <?= htmlspecialchars(ucfirst(strtolower($role))); ?>)</h2>

        <form action="" method="POST" enctype="multipart/form-data">
            <input type="hidden" name="role" value="<?= htmlspecialchars($role); ?>">

            <input type="text" name="name" placeholder="Nama Lengkap" required>
            <input type="email" name="email" placeholder="Email" required>

            <div class="password-wrapper">
                <input type="password" id="password" name="password" placeholder="Password" required>
                <button type="button" class="toggle-password" data-target="password">Show</button>
            </div>

            <div class="password-wrapper">
                <input type="password" id="confirmPassword" name="confirm_password" placeholder="Konfirmasi Password" required>
                <button type="button" class="toggle-password" data-target="confirmPassword">Show</button>
            </div>

            <small style="color: gray;">Password minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol.</small>

            <textarea name="address" placeholder="Alamat lengkap" required></textarea>

            <?php if ($role === 'SELLER'): ?>
            <div id="sellerFields">
                <input type="text" name="store_name" placeholder="Nama Toko (max 100 karakter)" maxlength="100" required>
                        
                <label for="editor">Deskripsi Toko:</label>
                <div id="editor"></div>
                <input type="hidden" name="store_description" id="store_description">
                
                <div class="file-input-group">
                    <label for="storeLogo">Logo Toko (wajib):</label>
                    <input type="file" name="store_logo" id="storeLogo" accept="image/*" required>
                </div>
            </div>
            <?php endif; ?>

            <button type="submit">Daftar</button>
            <p>Sudah punya akun? <a href="login.php">Masuk di sini</a></p>
        </form>
    </div>
</body>
</html>
