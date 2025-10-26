<?php
namespace App\Controllers;

require_once __DIR__ . '/../models/user.php';
use App\Models\User;

class ProfileController {
    private $userModel;
    private $userId;

    public function __construct($db, $userId) {
        $this->userModel = new User($db);
        $this->userId = $userId;
    }

    public function getUser() {
        return $this->userModel->findById($this->userId);
    }

    public function updateProfile($data): string {
        $name = trim($data['name']);
        $address = trim($data['address']);

        if ($this->userModel->updateProfile($this->userId, $name, $address)) {
            return "Profile berhasil diperbarui";
        } else {
            return "Update gagal. Cek server logs.";
        }
    }

    public function changePassword($data): string {
        $old = trim($data['old_password']);
        $new = trim($data['new_password']);
        $confirm = trim($data['confirm_password']);

        if ($new !== $confirm) return "Password baru dan konfirmasi tidak sama.";
        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$/', $new))
            return "Password minimal 8 karakter, harus ada huruf besar, huruf kecil, angka, dan simbol.";
        if (!$this->userModel->changePassword($this->userId, $old, $new))
            return "Password lama salah atau gagal update.";

        return "Password berhasil diubah.";
    }
}
