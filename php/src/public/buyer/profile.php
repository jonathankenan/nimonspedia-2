<?php
include_once(__DIR__ . '/../../app/utils/session.php');
include_once(__DIR__ . '/../../app/config/db.php');
include_once(__DIR__ . '/../../app/controllers/profileController.php');

requireLogin();
requireRole('BUYER');

$controller = new App\Controllers\ProfileController($conn, $_SESSION['user_id']);
$user = $controller->getUser();

$profileMsg = '';
$passwordMsg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['update_profile'])) {
        $profileMsg = $controller->updateProfile($_POST);
        $user = $controller->getUser();
        $_SESSION['name'] = $user['name'];
    }
    if (isset($_POST['change_password'])) {
        $passwordMsg = $controller->changePassword($_POST);
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Profile | Nimonspedia</title>
<link rel="stylesheet" href="../assets/css/profile.css">
<link rel="stylesheet" href="../assets/css/popup.css">
<script src="../assets/js/profile.js" defer></script>
</head>
    <body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>

    <!-- Hidden inputs untuk JS baca -->
    <input type="hidden" id="profile-msg" value="<?= htmlspecialchars($profileMsg) ?>">
    <input type="hidden" id="password-msg" value="<?= htmlspecialchars($passwordMsg) ?>">

    <div class="container">
        <h1>Profile Buyer</h1>

        <!-- Form Edit Profile -->
        <form method="POST" id="profile-form">
            <h2>Edit Profile</h2>
            <label>Nama</label>
            <input type="text" name="name" value="<?= htmlspecialchars($user['name']) ?>" required>
            <label>Email (readonly)</label>
            <input type="email" value="<?= htmlspecialchars($user['email']) ?>" readonly>
            <label>Alamat</label>
            <textarea name="address" required><?= htmlspecialchars($user['address']) ?></textarea>
            <button type="submit" name="update_profile">Simpan</button>
        </form>

        <!-- Form Change Password -->
        <form method="POST" id="password-form">
            <h2>Ubah Password</h2>
            <label>Password Lama</label>
            <input type="password" name="old_password" required>
            <label>Password Baru</label>
            <input type="password" name="new_password" required>
            <label>Konfirmasi Password Baru</label>
            <input type="password" name="confirm_password" required>
            <button type="submit" name="change_password">Ubah Password</button>
        </form>
    </div>

    <!-- Modal popup -->
    <div id="message-popup" class="popup">
        <div class="popup-content">
            <p id="popup-text"></p>
            <button id="popup-close">OK</button>
        </div>
    </div>

    </body>
</html>
