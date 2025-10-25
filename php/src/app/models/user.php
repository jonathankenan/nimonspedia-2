<?php
namespace App\Models;

use mysqli;

class User {
    private mysqli $conn;
    private string $table = "users";

    public function __construct(mysqli $db) {
        $this->conn = $db;
    }

    public function getLastError(): ?string {
        return $this->conn->error ?: null;
    }

    public function register($name, $email, $hashedPassword, $role, $address): bool {
        $stmt = $this->conn->prepare("
            INSERT INTO {$this->table} (name, email, password, role, address)
            VALUES (?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            error_log("Prepare failed: " . $this->conn->error);
            return false;
        }
        $stmt->bind_param("sssss", $name, $email, $hashedPassword, $role, $address);
        if (!$stmt->execute()) {
            error_log("Execute failed: " . $stmt->error);
            return false;
        }
        return true;
    }

    public function exists($email): bool {
        $query = "SELECT user_id FROM {$this->table} WHERE email = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        return $stmt->num_rows > 0;
    }

    public function findByEmail($email): ?array {
        $query = "SELECT * FROM {$this->table} WHERE email = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc() ?: null;
    }

    public function findById($id): ?array {
        $query = "SELECT * FROM {$this->table} WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc() ?: null;
    }

    public function updateBalance($id, $balance): bool {
        $query = "UPDATE {$this->table} SET balance = ? WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("di", $balance, $id);
        return $stmt->execute();
    }

    public function getLastInsertId() {
        return $this->conn->insert_id;
    }
}
