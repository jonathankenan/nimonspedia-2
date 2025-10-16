<?php

class User {
    private $conn;
    private $table = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getLastError() {
        return $this->conn->error;
    }

    // Register user baru
    public function register($name, $email, $hashedPassword, $role, $address) {
        $stmt = $this->conn->prepare("
            INSERT INTO users (name, email, password, role, address)
            VALUES (?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            $this->lastError = $this->conn->error;
            return false;
        }

        $stmt->bind_param("sssss", $name, $email, $hashedPassword, $role, $address);
        $result = $stmt->execute();

        if (!$result) {
            $this->lastError = $stmt->error;
        }

        $stmt->close();
        return $result;
    }


    // Cari user berdasarkan email
    public function findByEmail($email) {
        $query = "SELECT * FROM {$this->table} WHERE email = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $email);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    // Cek apakah email sudah terdaftar
    public function exists($email) {
        $query = "SELECT user_id FROM {$this->table} WHERE email = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        return $stmt->num_rows > 0;
    }

    // Ambil data user by ID
    public function getById($id) {
        $query = "SELECT * FROM {$this->table} WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    // Update saldo buyer
    public function updateBalance($id, $balance) {
        $query = "UPDATE {$this->table} SET balance = ? WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ii", $balance, $id);
        return $stmt->execute();
    }
}
