<?php
namespace App\Controllers;

use App\Models\User;

class LoginController
{
    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    public function loginAuth()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';

        $userModel = new User($this->conn);
        $user = $userModel->findByEmail($email);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['name'] = $user['name'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['balance'] = $user['balance'];

            if ($user['role'] === 'SELLER') {
                require_once dirname(__DIR__) . '/models/store.php';
                $storeModel = new \App\Models\Store($this->conn);
                $store = $storeModel->getByUserId($user['user_id']);
                if ($store) {
                    $_SESSION['store_id'] = $store['store_id'];
                }
            }
            if ($user['role'] === 'ADMIN') {
                header("Location: /authentication/login.php?error=admin_not_allowed");
                exit;
            }

            header("Location: /index.php");
            exit;
        } else {
            header("Location: /authentication/login.php?error=1");
            exit;
        }
    }
}
