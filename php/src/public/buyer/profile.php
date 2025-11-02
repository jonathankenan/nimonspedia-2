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
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Profile | Nimonspedia</title>
    <link rel="stylesheet" href="../assets/css/profile.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">

    <script src="../assets/js/profile.js" defer></script>
</head>
    <body>
    <?php include_once(__DIR__ . '/../../app/components/navbar.php'); ?>

    <!-- Hidden inputs untuk JS baca -->
    <input type="hidden" id="profile-msg" value="<?= htmlspecialchars($profileMsg) ?>">
    <input type="hidden" id="password-msg" value="<?= htmlspecialchars($passwordMsg) ?>">

    <div class="profile-container">
        <h1>Profile Buyer</h1>

        <!-- Form Edit Profile -->
        <form method="POST" id="profile-form" class="profile-section">
            <h2>Edit Profil</h2>
            <label for="name">Nama:</label>
            <input type="text" id="name" name="name" value="<?= htmlspecialchars($user['name']) ?>" required>
            
            <label for="email">Email (readonly)</label>
            <input type="email" id="email" value="<?= htmlspecialchars($user['email']) ?>" readonly>
            
            <label for="address">Alamat:</label>
            <textarea id="address" name="address" required><?= htmlspecialchars($user['address']) ?></textarea>
            
            <button type="submit" name="update_profile">Simpan</button>
        </form>

        <!-- Form Change Password -->
        <form method="POST" id="password-form">
            <h2>Ubah Password</h2>
            
            <label for="old_password">Password Lama:</label>
            <div class="password-wrapper">
                <input type="password" id="old_password" name="old_password" required>
            </div>
            
            <label for="new_password">Password Baru:</label>
            <div class="password-wrapper">
                <input type="password" id="new_password" name="new_password" required>
            </div>
            
            <label for="confirm_password">Konfirmasi Password Baru:</label>
            <div class="password-wrapper">
                <input type="password" id="confirm_password" name="confirm_password" required>
            </div>
            
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
