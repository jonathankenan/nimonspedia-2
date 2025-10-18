<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$role = $_SESSION['role'] ?? null;

if ($role === 'BUYER') {
    header("Location: /buyer/dashboard.php");
    exit;
} elseif ($role === 'SELLER') {
    header("Location: /seller/dashboard.php");
    exit;
}

include_once(__DIR__ . '/../app/config/db.php');
include_once(__DIR__ . '/../app/models/product.php');
include_once(__DIR__ . '/../app/components/navbar.php');

$productModel = new Product($conn);
$products = $productModel->getAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nimonspedia - Product Discovery</title>
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
  <h1>Selamat Datang di Nimonspedia!</h1>
  <p>Temukan produk menarik dari berbagai toko!</p>
</body>
</html>
