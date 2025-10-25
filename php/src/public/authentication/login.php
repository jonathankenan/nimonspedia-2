<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Login</title>
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
  <div class="container">
    <h1>Login</h1>

    <?php if (isset($_GET['error'])): ?>
      <p style="color:red;">Email atau password salah!</p>
    <?php endif; ?>
    
    <form action="/authentication/login.php?action=auth" method="POST">
      <label>Email:</label><br>
      <input type="email" name="email" required><br><br>

      <label>Password:</label><br>
      <input type="password" name="password" required><br><br>

      <button type="submit">Login</button>
    </form>

    <p>Belum punya akun? <a href="/authentication/register_role.php">Daftar</a></p>
  </div>
</body>
</html>
