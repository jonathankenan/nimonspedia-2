<?php
namespace App\Models;

class Store {
    private $conn;
    private $table = "stores";

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function create($userId, $storeName, $storeDescription, $storeLogoPath, $balance = 0) {
        $stmt = $this->conn->prepare("INSERT INTO {$this->table} (user_id, store_name, store_description, store_logo_path, balance) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("isssi", $userId, $storeName, $storeDescription, $storeLogoPath, $balance);
        $result = $stmt->execute();
        
        if (!$result) {
            error_log("Failed to create store: " . $stmt->error);
        }
        
        return $result;
    }

    public function getByUserId($userId) {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function getById($storeId) {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE store_id = ?");
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function getAll() {
        $result = $this->conn->query("SELECT * FROM {$this->table}");
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function update($storeId, array $data) {
        $allowedFields = ['store_name', 'store_description', 'store_logo_path'];
        $updates = [];
        $params = [];
        $types = '';

        foreach ($data as $field => $value) {
            if (in_array($field, $allowedFields)) {
                $updates[] = "$field = ?";
                $params[] = $value;
                $types .= 's'; // all fields are strings
            }
        }

        if (empty($updates)) {
            return false;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $updates) . " WHERE store_id = ?";
        $params[] = $storeId;
        $types .= 'i'; // store_id is integer

        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            error_log("Failed to prepare store update statement: " . $this->conn->error);
            return false;
        }

        $stmt->bind_param($types, ...$params);
        $result = $stmt->execute();

        if (!$result) {
            error_log("Failed to update store: " . $stmt->error);
        }

        return $result;
    }
}
