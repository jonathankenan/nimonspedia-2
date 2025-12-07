<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/json_response.php';
require_once __DIR__ . '/../utils/session.php';

/**
 * Check if a feature is enabled for the current user
 */
function checkFeatureAccess($userId, $featureName) {
    global $pdo;
    
    try {
        // Check user-specific flag
        $stmt = $pdo->prepare("
            SELECT is_enabled, reason 
            FROM user_feature_access 
            WHERE user_id = ? AND feature_name = ?
        ");
        $stmt->execute([$userId, $featureName]);
        $userFlag = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($userFlag) {
            return [
                'enabled' => (bool) $userFlag['is_enabled'],
                'reason' => $userFlag['reason'],
                'scope' => 'user'
            ];
        }
        
        // Check global flag (user_id = NULL)
        $stmt = $pdo->prepare("
            SELECT is_enabled, reason 
            FROM user_feature_access 
            WHERE user_id IS NULL AND feature_name = ?
        ");
        $stmt->execute([$featureName]);
        $globalFlag = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($globalFlag) {
            return [
                'enabled' => (bool) $globalFlag['is_enabled'],
                'reason' => $globalFlag['reason'],
                'scope' => 'global'
            ];
        }
        
        // Feature enabled by default if no flags found
        return [
            'enabled' => true,
            'reason' => null,
            'scope' => 'default'
        ];
    } catch (PDOException $e) {
        error_log("Feature access check error: " . $e->getMessage());
        return [
            'enabled' => true,
            'reason' => null,
            'scope' => 'default'
        ];
    }
}

/**
 * API endpoint to check feature access
 * GET /api/features/check?feature=chat_enabled
 */
function checkFeature() {
    requireLogin();
    
    $featureName = $_GET['feature'] ?? null;
    
    if (!$featureName) {
        sendJsonResponse(['error' => 'Feature name is required'], 400);
        return;
    }
    
    $validFeatures = ['chat_enabled', 'auction_enabled', 'checkout_enabled'];
    if (!in_array($featureName, $validFeatures)) {
        sendJsonResponse(['error' => 'Invalid feature name'], 400);
        return;
    }
    
    $userId = $_SESSION['user_id'];
    $access = checkFeatureAccess($userId, $featureName);
    
    sendJsonResponse($access);
}

/**
 * API endpoint to get all feature flags for current user
 * GET /api/features/all
 */
function getAllFeatures() {
    requireLogin();
    
    $userId = $_SESSION['user_id'];
    $features = [
        'chat_enabled' => checkFeatureAccess($userId, 'chat_enabled'),
        'auction_enabled' => checkFeatureAccess($userId, 'auction_enabled'),
        'checkout_enabled' => checkFeatureAccess($userId, 'checkout_enabled')
    ];
    
    sendJsonResponse(['features' => $features]);
}

/**
 * Helper function to enforce feature access in controllers
 */
function requireFeature($featureName) {
    requireLogin();
    
    $userId = $_SESSION['user_id'];
    $access = checkFeatureAccess($userId, $featureName);
    
    if (!$access['enabled']) {
        $reason = $access['reason'] ?? 'This feature is currently unavailable';
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Feature disabled',
            'reason' => $reason,
            'scope' => $access['scope']
        ]);
        exit;
    }
}
