<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once(__DIR__ . '/../../app/config/db.php'); 

if (!$conn) {
    die("Database connection failed: " . mysqli_connect_error());
}

session_start();
include_once(__DIR__ .'/../../app/models/user.php');


$userModel = new User($conn);

$name     = trim($_POST['name'] ?? '');
$email    = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$role     = $_POST['role'] ?? 'BUYER';
$address  = trim($_POST['address'] ?? '');

if (empty($name) || empty($email) || empty($password) || empty($address)) {
    header("Location: ../../public/register.php?error=empty");
    exit;
}

if ($userModel->exists($email)) {
    header("Location: ../../public/register.php?error=exists");
    exit;
}

$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

$success = $userModel->register($name, $email, $hashedPassword, $role, $address);

if ($success) { 
    header("Location: login.php?success=1"); exit; 
} else { 
    header("Location: register.php?error=failed"); exit; 
}