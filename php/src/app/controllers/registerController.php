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

        if (empty($name) || empty($email) || empty($password) || empty($address)) {
            header("Location: /authentication/register.php?error=empty_fields");
            exit;
        }

        $storeLogoPath = null;
        if ($role === 'SELLER') {
            if (empty($storeName) || empty($storeDescription) || !$storeLogo || $storeLogo['error'] === UPLOAD_ERR_NO_FILE) {
                header("Location: /authentication/register.php?error=seller_fields_required");
                exit;
            }

            $detectedType = mime_content_type($storeLogo['tmp_name']);
            $allowedTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/x-png',
                'image/pjpeg',
                'image/x-jpg'
            ];

            if (!in_array($detectedType, $allowedTypes)) {
                error_log('Invalid logo type detected: ' . $detectedType);
                header("Location: /authentication/register.php?error=invalid_logo_type");
                exit;
            }

            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/assets/images/storeLogo';
            if (!is_dir($uploadDir) || !is_writable($uploadDir)) {
                header("Location: /authentication/register.php?error=upload_folder_missing");
                exit;
            }

            $ext = strtolower(pathinfo($storeLogo['name'], PATHINFO_EXTENSION));
            $fileName = uniqid('logo_', true) . '.' . $ext;
            $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;

            if (move_uploaded_file($storeLogo['tmp_name'], $targetPath)) {
                $storeLogoPath = '/assets/images/storeLogo/' . $fileName;
            } else {
                header("Location: /authentication/register.php?error=upload_failed");
                exit;
            }
        }

        if ($userModel->exists($email)) {
            header("Location: /authentication/register.php?error=exists");
            exit;
        }

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

        if ($role === 'SELLER' && $storeName && $storeDescription && $storeLogoPath) {
            $storeModel = new Store($this->conn);
            $storeCreated = $storeModel->create($userId, $storeName, $storeDescription, $storeLogoPath);

            if (!$storeCreated) {
                header("Location: /authentication/register.php?error=store_create_failed");
                exit;
            }
        }

        header("Location: /authentication/login.php?success=1");
        exit;
    }
}
