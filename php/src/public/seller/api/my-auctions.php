<?php
require_once __DIR__ . '/../../../app/utils/session.php';
require_once __DIR__ . '/../../../app/config/db.php';
require_once __DIR__ . '/../../../app/utils/json_response.php';

session_start();

// --- AUTH CHECK ---
if (!isLoggedIn() || $_SESSION['role'] !== 'SELLER') {
    return sendError("Unauthorized", 401);
}

$user_id = $_SESSION['user_id'];

try {
    $db = getDatabaseConnection();
    
    // Get all auctions for this seller's products
    $stmt = $db->prepare("
        SELECT 
            a.auction_id,
            a.product_id,
            a.starting_price,
            a.current_price,
            a.min_increment,
            a.quantity,
            a.start_time,
            a.end_time,
            a.status,
            a.winner_id,
            a.created_at,
            p.product_name,
            p.main_image_path,
            p.price AS original_price,
            (SELECT COUNT(*) FROM auction_bids WHERE auction_id = a.auction_id) as bid_count,
            (SELECT MAX(bid_amount) FROM auction_bids WHERE auction_id = a.auction_id) as highest_bid
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        WHERE s.user_id = ?
        ORDER BY a.created_at DESC
    ");
    
    $stmt->execute([$user_id]);
    $auctions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert numeric fields to proper types
    foreach ($auctions as &$auction) {
        $auction['auction_id'] = (int)$auction['auction_id'];
        $auction['product_id'] = (int)$auction['product_id'];
        $auction['starting_price'] = (float)$auction['starting_price'];
        $auction['current_price'] = (float)$auction['current_price'];
        $auction['min_increment'] = (float)$auction['min_increment'];
        $auction['quantity'] = (int)$auction['quantity'];
        $auction['bid_count'] = (int)$auction['bid_count'];
        $auction['highest_bid'] = $auction['highest_bid'] ? (float)$auction['highest_bid'] : null;
        $auction['winner_id'] = $auction['winner_id'] ? (int)$auction['winner_id'] : null;
    }
    
    return sendSuccess($auctions);
    
} catch (Exception $e) {
    error_log("Error fetching seller auctions: " . $e->getMessage());
    return sendError("Failed to fetch auctions", 500);
}
