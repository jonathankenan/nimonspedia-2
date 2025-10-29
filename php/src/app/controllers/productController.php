<?php
namespace App\Controllers;

require_once(__DIR__ . '/../models/product.php');
require_once(__DIR__ . '/../models/categoryItem.php');

use App\Models\Product;
use App\Models\CategoryItem;

class ProductController {
    private $productModel;
    private $categoryItemModel;
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
        $this->productModel = new Product($db);
        $this->categoryItemModel = new CategoryItem($db);
    }

    public function deleteProduct($productId) {
        try {
            // Verify product belongs to seller's store
            $product = $this->productModel->getProductById($productId);
            if (!$product) {
                throw new \Exception("Product not found");
            }

            // Delete the product (soft delete)
            $success = $this->productModel->deleteProduct($productId);
            
            if (!$success) {
                throw new \Exception("Failed to delete product");
            }

            // Delete the image file if it exists
            if (!empty($product['main_image_path']) && 
                file_exists($_SERVER['DOCUMENT_ROOT'] . $product['main_image_path'])) {
                unlink($_SERVER['DOCUMENT_ROOT'] . $product['main_image_path']);
            }

            return true;
        } catch (\Exception $e) {
            error_log("Product deletion failed: " . $e->getMessage());
            return false;
        }
    }

    public function update($data, $imageFile = null) {
        try {
            if (!isset($data['productId'])) {
                throw new \Exception("Product ID is required");
            }

            $productId = $data['productId'];
            
            // Verify product belongs to seller's store
            $product = $this->productModel->getProductById($productId);
            if ($product['store_id'] != $_SESSION['store_id']) {
                throw new \Exception("Unauthorized to edit this product");
            }

            // Start transaction
            $this->conn->begin_transaction();

            try {
                $updateData = [
                    'product_name' => $data['productName'],
                    'description' => $data['description'],
                    'price' => intval($data['price']),
                    'stock' => intval($data['stock'])
                ];

                // Handle image update if provided
                if ($imageFile && !empty($imageFile['tmp_name'])) {
                    $this->validateImageFile($imageFile);
                    $uploadResult = $this->handleImageUpload($imageFile);
                    
                    if (!$uploadResult['success']) {
                        throw new \Exception($uploadResult['message']);
                    }

                    $updateData['main_image_path'] = $uploadResult['path'];

                    // Delete old image if exists and different
                    if (!empty($product['main_image_path']) && 
                        $product['main_image_path'] !== $uploadResult['path'] &&
                        file_exists($_SERVER['DOCUMENT_ROOT'] . $product['main_image_path'])) {
                        unlink($_SERVER['DOCUMENT_ROOT'] . $product['main_image_path']);
                    }
                }

                // Update product
                $updatedProduct = $this->productModel->update($productId, $updateData);

                // Update categories if provided
                if (isset($data['categories'])) {
                    // Delete existing category links
                    $this->categoryItemModel->deleteByProductId($productId);
                    
                    // Add new category links
                    $categories = is_array($data['categories']) ? $data['categories'] : [$data['categories']];
                    foreach ($categories as $categoryId) {
                        $this->categoryItemModel->linkProduct($categoryId, $productId);
                    }
                }

                $this->conn->commit();
                return [
                    'success' => true,
                    'message' => 'Product updated successfully',
                    'data' => $updatedProduct
                ];
            } catch (\Exception $e) {
                $this->conn->rollback();
                throw $e;
            }
        } catch (\Exception $e) {
            error_log("Product update failed: " . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    public function create($data, $imageFile) {
        try {
            // Check session
            if (!isset($_SESSION['store_id'])) {
                throw new \Exception("Store ID not found in session. Session: " . json_encode($_SESSION));
            }

            // Validate input
            $this->validateProductData($data);
            $this->validateImageFile($imageFile);

            // Process image
            $uploadResult = $this->handleImageUpload($imageFile);
            if (!$uploadResult['success']) {
                throw new \Exception($uploadResult['message']);
            }

            // Start transaction
            $this->conn->begin_transaction();

            try {
                // Debug: Log data before creation
                $productData = [
                    'store_id' => $_SESSION['store_id'],
                    'product_name' => $data['productName'],
                    'description' => $data['description'],
                    'price' => intval($data['price']),
                    'stock' => intval($data['stock']),
                    'main_image_path' => $uploadResult['path']
                ];
                error_log("Creating product with data: " . json_encode($productData));

                // Create product
                $product = $this->productModel->create($productData);

                // Link product to categories
                $categories = is_array($data['categories']) ? $data['categories'] : [$data['categories']];
                foreach ($categories as $categoryId) {
                    $this->categoryItemModel->linkProduct($categoryId, $product['product_id']);
                }

                $this->conn->commit();
                return [
                    'success' => true,
                    'message' => 'Product created successfully',
                    'data' => $product
                ];
            } catch (\Exception $e) {
                $this->conn->rollback();
                // Delete uploaded image if product creation fails
                if (file_exists($_SERVER['DOCUMENT_ROOT'] . $uploadResult['path'])) {
                    unlink($_SERVER['DOCUMENT_ROOT'] . $uploadResult['path']);
                }
                throw $e;
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    private function validateProductData($data) {
        $requiredFields = ['productName', 'description', 'price', 'stock', 'categories'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                throw new \Exception("Field '$field' is required");
            }
        }

        if (strlen($data['productName']) > 200) {
            throw new \Exception('Product name too long (max 200 characters)');
        }

        if (strlen($data['description']) > 1000) {
            throw new \Exception('Description too long (max 1000 characters)');
        }

        if (intval($data['price']) < 1000) {
            throw new \Exception('Price must be at least Rp 1.000');
        }

        if (intval($data['stock']) < 0) {
            throw new \Exception('Stock cannot be negative');
        }

        if (empty($data['categories'])) {
            throw new \Exception('At least one category must be selected');
        }
    }

    private function validateImageFile($file) {
        if (!isset($file) || !isset($file['tmp_name']) || empty($file['tmp_name'])) {
            throw new \Exception('Product image is required');
        }

        $allowedTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];
        $maxSize = 2 * 1024 * 1024; // 2MB

        if ($file['size'] > $maxSize) {
            throw new \Exception('Image size too large (max 2MB)');
        }

        if (!in_array($file['type'], $allowedTypes)) {
            throw new \Exception('Invalid image format (JPG, JPEG, PNG, WEBP only)');
        }
    }

    private function handleImageUpload($file) {
        $uploadDir = '/assets/images/products/';
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '.' . $extension;
        $uploadPath = $_SERVER['DOCUMENT_ROOT'] . $uploadDir . $filename;
        $relativePath = $uploadDir . $filename;

        // Create directory if it doesn't exist
        if (!is_dir(dirname($uploadPath))) {
            mkdir(dirname($uploadPath), 0777, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            return [
                'success' => false,
                'message' => 'Failed to upload image'
            ];
        }

        return [
            'success' => true,
            'path' => $relativePath
        ];
    }
}