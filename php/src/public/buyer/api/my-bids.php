<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

session_start();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'BUYER') {
    return sendError("Unauthorized", 401);
}

$user_id = $_SESSION['user_id'];

try {
    $db = getDatabaseConnection();
    
    // Get user's active bids
    $stmt = $db->prepare("
        SELECT 
            a.auction_id,
            a.product_id,
            a.current_price,
            a.status,
            a.end_time,
            p.product_name,
            p.main_image_path,
            s.store_name,
            MAX(ab.bid_amount) AS user_highest_bid
        FROM auction_bids ab
        JOIN auctions a ON ab.auction_id = a.auction_id
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        WHERE ab.bidder_id = ? AND a.status IN ('active', 'scheduled')
        GROUP BY a.auction_id
        ORDER BY a.end_time ASC
    ");
    
    $stmt->execute([$user_id]);
    $bids = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert numeric fields to proper types
    foreach ($bids as &$bid) {
        $bid['auction_id'] = (int)$bid['auction_id'];
        $bid['product_id'] = (int)$bid['product_id'];
        $bid['current_price'] = (float)$bid['current_price'];
        $bid['user_highest_bid'] = (float)$bid['user_highest_bid'];
    }
    
    return sendSuccess($bids);
    
} catch (Exception $e) {
    error_log("Error fetching user active bids: " . $e->getMessage());
    return sendError("Failed to fetch bids", 500);
}
