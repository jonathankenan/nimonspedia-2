<?php
namespace App\Models;

class Feature {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function checkAccess($userId, $featureName) {
        // Cek rule User & Global; jika salah satu disabled (0), maka akses ditolak.
        $stmt = $this->conn->prepare("SELECT is_enabled, reason FROM user_feature_access WHERE (user_id = ? OR user_id IS NULL) AND feature_name = ?");
        $stmt->bind_param("is", $userId, $featureName);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            if ($row['is_enabled'] == 0) {
                return ['allowed' => false, 'reason' => $row['reason'] ?? 'Fitur dinonaktifkan.'];
            }
        }
        
        return ['allowed' => true, 'reason' => null];
    }
}