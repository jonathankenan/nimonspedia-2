<?php
namespace App\Models;

class Store {
    private $conn;
    private $table = "stores";

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function create($userId, $storeName, $storeDescription, $storeLogoPath) {
        $stmt = $this->conn->prepare("INSERT INTO {$this->table} (user_id, store_name, store_description, store_logo_path) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $userId, $storeName, $storeDescription, $storeLogoPath);
        return $stmt->execute();
    }

    public function getByUserId($userId) {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function getAll() {
        $result = $this->conn->query("SELECT * FROM {$this->table}");
        return $result->fetch_all(MYSQLI_ASSOC);
    }
}
