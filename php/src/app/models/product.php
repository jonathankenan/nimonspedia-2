<?php
namespace App\Models;

class Product {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getAll() {
        $query = "SELECT p.*, s.store_name 
                  FROM products p
                  JOIN stores s ON p.store_id = s.store_id
                  WHERE p.deleted_at IS NULL
                  ORDER BY p.created_at DESC";

        $result = $this->conn->query($query);
        return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    }
}
?>
