<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$basePath = dirname(__DIR__, 2);

require_once $basePath . '/app/config/db.php';
require_once $basePath . '/app/models/user.php';
require_once $basePath . '/app/controllers/loginController.php';

use App\Controllers\LoginController;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'auth') {
    $controller = new LoginController($conn);
    $controller->loginAuth();
    exit;
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Masuk ke Nimonspedia</title>
  
  <link rel="stylesheet" href="/assets/css/authentication.css">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
</head>
<body>
  
  <div class="login-container">
    
    <h1>Masuk ke <i>Nimonspedia</i> 🍌!</h1>

    <?php if (isset($_GET['error'])): ?>
      <p class="error-message">Email atau password salah!</p>
    <?php endif; ?>
    
    <form action="/authentication/login.php?action=auth" method="POST">
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>

      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>

      <button type="submit">Masuk</button>
    </form>

    <p class="register-link">
      Belum mempunyai akun? <a href="/authentication/register_role.php">Daftar</a>
    </p>
  </div>

</body>
</html>