<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['role'])) {
    $_SESSION['role'] = $_POST['role'];
    header('Location: /authentication/register.php');
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Pilih Role | Nimonspedia</title>
    <link rel="stylesheet" href="/assets/css/style.css"> 
</head>
<body>
    <div class="container">
        <h2>Daftar Akun Nimonspedia</h2>

        <form action="" method="POST" class="role-form">
            <div class="role-options">
                <label class="role-card">
                    <input type="radio" name="role" value="BUYER" required> 
                    <span>Buyer</span>
                </label>

                <label class="role-card">
                    <input type="radio" name="role" value="SELLER" required> 
                    <span>Seller</span>
                </label>
            </div>

            <button type="submit" id="nextBtn">Lanjut ke Pendaftaran</button>
        </form>

        <p>Sudah punya akun? <a href="login.php">Masuk di sini</a></p>
    </div>
</body>
</html>
