<?php
namespace App\Models;

class Product {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getFilteredProducts(array $filters = [], int $page = 1, int $perPage = 12): array {
        $where = ["p.deleted_at IS NULL"];
        $join = "INNER JOIN stores s ON p.store_id = s.store_id";

        if (!empty($filters['category'])) {
            $cat = $this->conn->real_escape_string($filters['category']);
            $join .= " INNER JOIN category_items ci ON p.product_id = ci.product_id
                       INNER JOIN categories c ON ci.category_id = c.category_id";
            $where[] = "c.name = '$cat'";
        }

        if (!empty($filters['search'])) {
            $search = $this->conn->real_escape_string($filters['search']);
            $where[] = "LOWER(p.product_name) LIKE LOWER('%$search%')";
        }

        if (!empty($filters['store_id'])) {
            $storeId = (int)$filters['store_id'];
            $where[] = "p.store_id = $storeId";
        }

        if (!empty($filters['min_price'])) {
            $min = (int)$filters['min_price'];
            $where[] = "p.price >= $min";
        }

        if (!empty($filters['max_price'])) {
            $max = (int)$filters['max_price'];
            $where[] = "p.price <= $max";
        }

        $whereSQL = implode(' AND ', $where);
        $sql = "SELECT p.*, s.store_name, s.store_logo_path
                FROM products p
                $join
                WHERE $whereSQL
                ORDER BY p.created_at DESC";

        $result = paginate($this->conn, $sql, $perPage, $page);
        $totalPages = getTotalPages($this->conn, "($sql) AS sub", $perPage);

        return [
            'products' => $result,
            'totalPages' => $totalPages
        ];
    }

    public function findProductWithStoreById(int $productId) {
        $productId = (int)$productId;
        $sql = "SELECT p.*, s.store_name, s.store_description, s.store_id, s.store_logo_path
                FROM products p
                INNER JOIN stores s ON p.store_id = s.store_id
                WHERE p.product_id = $productId AND p.deleted_at IS NULL";
        $res = $this->conn->query($sql);
        return $res ? $res->fetch_assoc() : null;
    }

    public function getCategoriesForProduct(int $productId): array {
        $productId = (int)$productId;
        $sql = "SELECT c.name
                FROM categories c
                INNER JOIN category_items ci ON ci.category_id = c.category_id
                WHERE ci.product_id = $productId
                ORDER BY c.name ASC";
        $res = $this->conn->query($sql);
        $cats = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $cats[] = $row['name'];
            }
        }
        return $cats;
    }

    public function getAllCategories(): array {
        $catRes = $this->conn->query("SELECT * FROM categories ORDER BY name ASC");
        $categories = [];
        while ($row = $catRes->fetch_assoc()) {
            $categories[] = $row['name'];
        }
        return $categories;
    }
}
