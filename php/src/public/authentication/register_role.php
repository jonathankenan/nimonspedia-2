<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['role'])) {
    $_SESSION['role'] = $_POST['role'];
    header('Location: /authentication/register.php');
    exit();
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Pilih Role | Nimonspedia</title>
    
    <link rel="stylesheet" href="/assets/css/authentication.css"> 
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
</head>
<body>
    <div class="login-container">
        
        <h1>Daftar ke Nimonspedia 🍌!</h1>

        <form action="" method="POST">
            <p class="role-prompt">Ingin Mendaftar Sebagai Apa?</p>

            <div class="role-selection">
                <input type="radio" name="role" value="BUYER" id="role_buyer" required>
                <label for="role_buyer" class="role-button">Buyer</label>

                <input type="radio" name="role" value="SELLER" id="role_seller" required>
                <label for="role_seller" class="role-button">Seller</label>
            </div>
            
            <button type="submit" id="nextBtn">Lanjutkan</button>
        </form>

        <p class="register-link">Sudah mempunyai akun? <a href="login.php">Masuk</a></p>
    </div>
</body>
</html>