<?php
namespace App\Models;

class Product {
    private $conn;
    private $table = "products";

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function deleteProduct($productId) {
        try {
            $stmt = $this->conn->prepare("UPDATE {$this->table} SET deleted_at = CURRENT_TIMESTAMP WHERE product_id = ?");
            $stmt->bind_param("i", $productId);
            return $stmt->execute();
        } catch (\Exception $e) {
            error_log("Failed to delete product: " . $e->getMessage());
            return false;
        }
    }

    public function countByStoreId($storeId) {
        $sql = "SELECT COUNT(*) as total FROM {$this->table} WHERE store_id = ? AND deleted_at IS NULL";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $storeId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row['total'] ?? 0;
    }

    public function countLowStockByStoreId($storeId, $threshold = 5) {
        $sql = "SELECT COUNT(*) as total FROM {$this->table} WHERE store_id = ? AND stock <= ? AND deleted_at IS NULL";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ii", $storeId, $threshold);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row['total'] ?? 0;
    }

    public function decrementStock($productId, $quantity) {
        try {
            $this->conn->begin_transaction();
            
            // Check current stock first with lock
            $stmt = $this->conn->prepare("
                SELECT stock FROM {$this->table} 
                WHERE product_id = ? AND deleted_at IS NULL 
                FOR UPDATE
            ");
            $stmt->bind_param("i", $productId);
            $stmt->execute();
            $result = $stmt->get_result();
            $product = $result->fetch_assoc();
            
            if (!$product || $product['stock'] < $quantity) {
                throw new \Exception("Insufficient stock");
            }
            
            // Update stock
            $stmt = $this->conn->prepare("
                UPDATE {$this->table} 
                SET stock = stock - ? 
                WHERE product_id = ? AND deleted_at IS NULL
            ");
            $stmt->bind_param("ii", $quantity, $productId);
            if (!$stmt->execute()) {
                throw new \Exception("Failed to update stock");
            }

            $this->conn->commit();
            return true;
        } catch (\Exception $e) {
            $this->conn->rollback();
            error_log("Stock update failed: " . $e->getMessage());
            return false;
        }
    }

    public function incrementStock($productId, $quantity) {
        try {
            $this->conn->begin_transaction();
            
            // Check if product exists with lock
            $stmt = $this->conn->prepare("
                SELECT product_id FROM {$this->table} 
                WHERE product_id = ? AND deleted_at IS NULL 
                FOR UPDATE
            ");
            $stmt->bind_param("i", $productId);
            $stmt->execute();
            
            if (!$stmt->get_result()->fetch_assoc()) {
                throw new \Exception("Product not found");
            }
            
            // Update stock
            $stmt = $this->conn->prepare("
                UPDATE {$this->table} 
                SET stock = stock + ? 
                WHERE product_id = ? AND deleted_at IS NULL
            ");
            $stmt->bind_param("ii", $quantity, $productId);
            if (!$stmt->execute()) {
                throw new \Exception("Failed to update stock");
            }

            $this->conn->commit();
            return true;
        } catch (\Exception $e) {
            $this->conn->rollback();
            error_log("Stock update failed: " . $e->getMessage());
            return false;
        }
    }

    public function getFilteredProducts(array $filters = [], int $page = 1, int $perPage = 10): array {
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

    public function getProductsByStoreId($storeId, $page = 1, $perPage = 10): array {
        // Get total products for pagination
        $countSql = "SELECT COUNT(DISTINCT p.product_id) as total
                    FROM {$this->table} p
                    WHERE p.store_id = ? AND p.deleted_at IS NULL";
        $countStmt = $this->conn->prepare($countSql);
        $countStmt->bind_param("i", $storeId);
        $countStmt->execute();
        $totalProducts = $countStmt->get_result()->fetch_assoc()['total'];
        $totalPages = ceil($totalProducts / $perPage);

        // Calculate offset
        $offset = ($page - 1) * $perPage;

        // Get products with categories
        $sql = "SELECT p.*, 
                       GROUP_CONCAT(c.name) as categories
                FROM {$this->table} p
                LEFT JOIN category_items ci ON p.product_id = ci.product_id
                LEFT JOIN categories c ON ci.category_id = c.category_id
                WHERE p.store_id = ? AND p.deleted_at IS NULL
                GROUP BY p.product_id
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?";

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new \Exception("Failed to prepare statement: " . $this->conn->error);
        }

        $stmt->bind_param("iii", $storeId, $perPage, $offset);
        if (!$stmt->execute()) {
            throw new \Exception("Failed to execute statement: " . $stmt->error);
        }

        $result = $stmt->get_result();
        $products = [];
        while ($row = $result->fetch_assoc()) {
            // Convert categories string to array
            $row['categories'] = $row['categories'] ? explode(',', $row['categories']) : [];
            $products[] = $row;
        }

        return [
            'products' => $products,
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

    /**
     * Create a new product
     * @param array $data Product data
     * @return array Created product data
     * @throws \Exception If creation fails
     */
    public function create(array $data): array {
        // Validate required fields
        $requiredFields = ['store_id', 'product_name', 'description', 'price', 'stock', 'main_image_path'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                throw new \Exception("Missing required field: {$field}");
            }
        }

        try {
            // Prepare the SQL statement
            $stmt = $this->conn->prepare("
                INSERT INTO {$this->table} (
                    store_id,
                    product_name,
                    description,
                    price,
                    stock,
                    main_image_path
                ) VALUES (?, ?, ?, ?, ?, ?)
            ");

            if (!$stmt) {
                throw new \Exception("Prepare failed: " . $this->conn->error);
            }

            // Bind parameters
            if (!$stmt->bind_param("issiis",
                $data['store_id'],
                $data['product_name'],
                $data['description'],
                $data['price'],
                $data['stock'],
                $data['main_image_path']
            )) {
                throw new \Exception("Binding parameters failed: " . $stmt->error);
            }

            // Execute the statement
            if (!$stmt->execute()) {
                throw new \Exception("Execute failed: " . $stmt->error);
            }

            $productId = $stmt->insert_id;
            $stmt->close();

            // Fetch and return the created product
            return $this->getProductById($productId);
        } catch (\Exception $e) {
            error_log("Product creation failed: " . $e->getMessage());
            throw new \Exception("Failed to create product: " . $e->getMessage());
        }
    }

    /**
     * Get product by ID
     * @param int $productId Product ID
     * @return array Product data
     * @throws \Exception If product not found
     */
    public function getProductById(int $productId): ?array {
        try {
            $stmt = $this->conn->prepare("
                SELECT p.*, s.store_id 
                FROM {$this->table} p
                INNER JOIN stores s ON p.store_id = s.store_id
                WHERE p.product_id = ? AND p.deleted_at IS NULL
            ");

            if (!$stmt) {
                throw new \Exception("Database error: " . $this->conn->error);
            }

            $stmt->bind_param("i", $productId);
            if (!$stmt->execute()) {
                throw new \Exception("Execute failed: " . $stmt->error);
            }
            $result = $stmt->get_result();
            $product = $result->fetch_assoc();
            if (!$product) {
                throw new \Exception("Product not found");
            }

            // Fetch category IDs for this product
            $catStmt = $this->conn->prepare("SELECT category_id FROM category_items WHERE product_id = ?");
            $catStmt->bind_param("i", $productId);
            $catStmt->execute();
            $catRes = $catStmt->get_result();
            $categoryIds = [];
            while ($catRow = $catRes->fetch_assoc()) {
                $categoryIds[] = $catRow['category_id'];
            }
            $product['category_ids'] = $categoryIds;

            return $product;
        } catch (\Exception $e) {
            error_log("Error in getProductById: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Update an existing product
     * @param int $productId Product ID to update
     * @param array $data Updated product data
     * @return bool True if successful, false otherwise
     */
    public function update(int $productId, array $data): bool {
        try {
            $this->conn->begin_transaction();

            // Check if image path should be updated
            $shouldUpdateImage = isset($data['main_image_path']) || isset($data['image_url']);

            // Update product details
            $stmt = $this->conn->prepare("
                UPDATE {$this->table} 
                SET product_name = ?, 
                    description = ?, 
                    price = ?, 
                    stock = ?
                    " . ($shouldUpdateImage ? ", main_image_path = ?" : "") . "
                WHERE product_id = ? AND deleted_at IS NULL
            ");

            $params = [
                $data['name'] ?? $data['product_name'], 
                $data['description'], 
                $data['price'], 
                $data['stock']
            ];
            
            // Build types string: name(s), description(s), price(d), stock(i)
            $types = "ssdi";
            
            if ($shouldUpdateImage) {
                $params[] = $data['main_image_path'] ?? $data['image_url'];
                $types .= "s"; // image path is string
            }
            $params[] = $productId;
            $types .= "i"; // product_id is integer
            
            $stmt->bind_param($types, ...$params);

            if (!$stmt->execute()) {
                throw new \Exception("Failed to update product details");
            }

            // Update categories if provided
            if (isset($data['categories'])) {
                // Remove existing categories
                $stmt = $this->conn->prepare("DELETE FROM category_items WHERE product_id = ?");
                $stmt->bind_param("i", $productId);
                if (!$stmt->execute()) {
                    throw new \Exception("Failed to remove existing categories");
                }

                // Add new categories
                if (!empty($data['categories'])) {
                    $values = array_fill(0, count($data['categories']), "(?, ?)");
                    $sql = "INSERT INTO category_items (product_id, category_id) VALUES " . implode(", ", $values);
                    $stmt = $this->conn->prepare($sql);
                    
                    $params = [];
                    foreach ($data['categories'] as $categoryId) {
                        $params[] = $productId;
                        $params[] = $categoryId;
                    }
                    
                    $types = str_repeat("ii", count($data['categories']));
                    $stmt->bind_param($types, ...$params);
                    
                    if (!$stmt->execute()) {
                        throw new \Exception("Failed to add new categories");
                    }
                }
            }

            $this->conn->commit();
            return true;
        } catch (\Exception $e) {
            $this->conn->rollback();
            error_log("Product update failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Restore a soft-deleted product
     * @param int $productId Product ID to restore
     * @return bool True if successful, false otherwise
     */
    public function restoreProduct($productId) {
        try {
            $stmt = $this->conn->prepare("UPDATE {$this->table} SET deleted_at = NULL WHERE product_id = ?");
            $stmt->bind_param("i", $productId);
            return $stmt->execute();
        } catch (\Exception $e) {
            error_log("Failed to restore product: " . $e->getMessage());
            return false;
        }
    }
}
