<?php
namespace App\Models;

class Feature {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function checkAccess($userId, $featureName) {
        $stmt = $this->conn->prepare("SELECT is_enabled, reason FROM user_feature_access WHERE user_id = ? AND feature_name = ?");
        $stmt->bind_param("is", $userId, $featureName);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            if ($row['is_enabled'] == 0) {
                return ['allowed' => false, 'reason' => $row['reason'] ?? 'Fitur dinonaktifkan.'];
            }
        }
        return ['allowed' => true, 'reason' => null];
    }
}