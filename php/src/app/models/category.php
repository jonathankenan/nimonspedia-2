<?php
namespace App\Models;

class Category {
    private $conn;
    private $table = "categories";

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getAll() {
        $result = $this->conn->query("SELECT * FROM {$this->table} ORDER BY name ASC");
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function create($name) {
        $stmt = $this->conn->prepare("INSERT INTO {$this->table} (name) VALUES (?)");
        $stmt->bind_param("s", $name);
        return $stmt->execute();
    }
}
