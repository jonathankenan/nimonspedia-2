<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start(); 
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Login</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <h1>Login</h1>
  <?php if (isset($_GET['error'])): ?>
    <p style="color:red;">Email atau password salah!</p>
  <?php endif; ?>
  <form action="/loginAuth.php" method="POST">
    <label>Email:</label><br>
    <input type="email" name="email" required><br><br>

    <label>Password:</label><br>
    <input type="password" name="password" required><br><br>

    <button type="submit">Login</button>
  </form>
  <p>Belum punya akun? <a href="register.php">Daftar</a></p>
</body>
</html>
