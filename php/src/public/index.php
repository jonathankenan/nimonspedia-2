<?php
include_once(__DIR__ . '/../app/utils/session.php');

requireLogin();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Home - Nimonspedia</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <h1>Selamat datang, <?= htmlspecialchars($_SESSION['name']) ?>!</h1>
  <p>Role kamu: <?= htmlspecialchars($_SESSION['role']) ?></p>
  <a href="/authentication/logout.php">Logout</a>
</body>
</html>
