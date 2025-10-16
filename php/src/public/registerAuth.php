<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once(__DIR__ . '/../app/config/db.php');  // inisialisasi $conn dulu

if (!$conn) {
    die("Database connection failed: " . mysqli_connect_error());
}

session_start();
include_once(__DIR__ .'/../app/models/user.php');


$userModel = new User($conn);

// Ambil data dari form register
$name     = trim($_POST['name'] ?? '');
$email    = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$role     = $_POST['role'] ?? 'BUYER';
$address  = trim($_POST['address'] ?? '');

// Validasi input sederhana
if (empty($name) || empty($email) || empty($password) || empty($address)) {
    header("Location: ../../public/register.php?error=empty");
    exit;
}

// Cek apakah email sudah terdaftar
if ($userModel->exists($email)) {
    header("Location: ../../public/register.php?error=exists");
    exit;
}

// Hash password pakai bcrypt
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// Simpan ke database
$success = $userModel->register($name, $email, $hashedPassword, $role, $address);

if ($success) { 
    header("Location: login.php?success=1"); exit; 
} else { 
    header("Location: register.php?error=failed"); exit; 
}