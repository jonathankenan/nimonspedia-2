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
</head>
<body>
    <div class="container">
        <h2>Daftar Akun Nimonspedia (Sebagai <?= htmlspecialchars(ucfirst(strtolower($role))); ?>)</h2>

        <form action="" method="POST" enctype="multipart/form-data">
            <input type="hidden" name="role" value="<?= htmlspecialchars($role); ?>">

            <input type="text" name="name" placeholder="Nama Lengkap" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" id="password" name="password" placeholder="Password" required>
            <input type="password" id="confirmPassword" name="confirm_password" placeholder="Konfirmasi Password" required>
            <textarea name="address" placeholder="Alamat lengkap" required></textarea>

            <?php if ($role === 'SELLER'): ?>
            <div id="sellerFields">
                <input type="text" name="store_name" placeholder="Nama Toko (max 100 karakter)" maxlength="100" required>
                <textarea name="store_description" placeholder="Deskripsi Toko" required></textarea>
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
