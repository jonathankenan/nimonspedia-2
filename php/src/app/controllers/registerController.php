<?php
namespace App\Controllers;

require_once __DIR__ . '/../models/user.php';
require_once __DIR__ . '/../models/store.php';

use App\Models\User;
use App\Models\Store;

class registerController {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function register(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $userModel = new User($this->conn);

        $name     = trim($_POST['name'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $role     = $_POST['role'] ?? 'BUYER';
        $address  = trim($_POST['address'] ?? '');

        $storeName        = trim($_POST['store_name'] ?? '');
        $storeDescription = trim($_POST['store_description'] ?? '');
        $storeLogo        = $_FILES['store_logo'] ?? null;

        // Validasi input dasar
        if (empty($name) || empty($email) || empty($password) || empty($address)) {
            header("Location: /authentication/register.php?error=empty_fields");
            exit;
        }

        // Upload logo jika SELLER
        $storeLogoPath = null;
        if ($role === 'SELLER') {
            if (empty($storeName) || empty($storeDescription) || !$storeLogo || $storeLogo['error'] === UPLOAD_ERR_NO_FILE) {
                header("Location: /authentication/register.php?error=seller_fields_required");
                exit;
            }

            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($storeLogo['type'], $allowedTypes)) {
                header("Location: /authentication/register.php?error=invalid_logo_type");
                exit;
            }

            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/assets/images/storeLogo';
            if (!is_dir($uploadDir) || !is_writable($uploadDir)) {
                header("Location: /authentication/register.php?error=upload_folder_missing");
                exit;
            }

            $ext = pathinfo($storeLogo['name'], PATHINFO_EXTENSION);
            $fileName = uniqid('logo_', true) . '.' . $ext;
            $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;

            if (move_uploaded_file($storeLogo['tmp_name'], $targetPath)) {
                $storeLogoPath = '/assets/images/storeLogo/' . $fileName;
            } else {
                header("Location: /authentication/register.php?error=upload_failed");
                exit;
            }
        }

        // Cek user sudah ada
        if ($userModel->exists($email)) {
            header("Location: /authentication/register.php?error=exists");
            exit;
        }

        // Insert user
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $success = $userModel->register(
            $name,
            $email,
            $hashedPassword,
            $role,
            $address
        );

        if (!$success) {
            error_log("Register failed: " . $userModel->getLastError());
            header("Location: /authentication/register.php?error=register_failed");
            exit;
        }

        $userId = $userModel->getLastInsertId();

        // Buat store jika SELLER
        if ($role === 'SELLER' && $storeName && $storeDescription && $storeLogoPath) {
            $storeModel = new Store($this->conn);
            $storeCreated = $storeModel->create($userId, $storeName, $storeDescription, $storeLogoPath);

            if (!$storeCreated) {
                header("Location: /authentication/register.php?error=store_create_failed");
                exit;
            }
        }

        // Redirect ke login
        header("Location: /authentication/login.php?success=1");
        exit;
    }
}
