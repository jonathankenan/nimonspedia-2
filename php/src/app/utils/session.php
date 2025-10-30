<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        header("Location: /authentication/login.php");
        exit;
    }
}

# Validate user role, if not match, redirect to login
function requireRole($role) {
    requireLogin();
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== $role) {
        header("Location: /authentication/login.php");
        exit;
    }
}