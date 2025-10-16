<?php
session_start();
include_once(__DIR__ . '/../app/config/db.php');
include_once(__DIR__ . '/../app/models/user.php');

$userModel = new User($conn);

$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

$user = $userModel->findByEmail($email);

if ($user && password_verify($password, $user['password'])) {
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['role'] = $user['role'];
    header("Location: /index.php");
    exit;
} else {
    header("Location: /login.php?error=1");
    exit;
}
