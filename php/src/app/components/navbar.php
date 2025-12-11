<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../models/feature.php';

if (!isset($conn)) {
    global $conn;
}

// [TAMBAHAN] Cek Status
$featureModel = new \App\Models\Feature($conn);
$user_id = $_SESSION['user_id'] ?? null;
$role = $_SESSION['role'] ?? null;
$name = $_SESSION['name'] ?? 'Guest';
$balance = $_SESSION['balance'] ?? 0;
$cart_count = $_SESSION['cart_count'] ?? 0;

// Default state (Hidup jika tidak ada user login/config)
$can_checkout = true;
$can_chat = true; 
$can_auction = true; // (kenan) [TAMBAHAN BARU] Default true untuk Auction

if ($user_id) {
    // 1. Cek Checkout
    $access = $featureModel->checkAccess($user_id, 'checkout_enabled');
    $can_checkout = $access['allowed'];

    // 2. Cek Chat
    $chat_access = $featureModel->checkAccess($user_id, 'chat_enabled');
    $can_chat = $chat_access['allowed'];

    // 3. (kenan) [TAMBAHAN BARU] Cek Auction
    $auction_access = $featureModel->checkAccess($user_id, 'auction_enabled');
    $can_auction = $auction_access['allowed'];
}

// --- JWT GENERATION FOR REACT ADMIN ---
$jwt_token = null;
if (isset($_SESSION['user_id'])) {
    $secret = 'rahasia_negara_nimons'; 
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    
    // Payload disesuaikan agar cocok dengan Node.js Controller
    $payload = json_encode([
        'user_id' => $_SESSION['user_id'], 
        'userId' => $_SESSION['user_id'],   
        'role' => $_SESSION['role'],
        'name' => $_SESSION['name'],        
        'iat' => time(),
        'exp' => time() + (60 * 60 * 24) 
    ]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    $jwt_token = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}
?>

<?php if ($jwt_token): ?>
<script>
    // Auto-inject token from PHP session
    if (!localStorage.getItem('adminToken') || localStorage.getItem('adminToken') !== '<?= $jwt_token ?>') {
        localStorage.setItem('adminToken', '<?= $jwt_token ?>');
        localStorage.setItem('userRole', '<?= $_SESSION['role'] ?>');
        localStorage.setItem('adminName', '<?= $_SESSION['name'] ?>');
        console.log('Token synced from PHP session');
    }
</script>
<?php endif; ?>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/navbar.css">
<script src="/assets/js/dropdown.js" defer></script>
<script src="/assets/js/topup.js" defer></script>

<nav>
    <div class="nav-left">
        <?php if ($role === 'SELLER'): ?>
            <a href="/seller/dashboard.php">Nimonspedia</a>
        <?php else: ?>
            <a href="/index.php">Nimonspedia</a>
        <?php endif; ?>
    </div>

    <div class="nav-right">
        <?php if (!$role): ?>
            <a href="/index.php">Beranda</a>
            <a href="/authentication/login.php">Masuk</a>
            <a href="/authentication/register_role.php">Daftar</a>

        <?php elseif ($role === 'BUYER'): ?>
            
            <?php if ($can_auction): ?>
                <a href="/auction">Lelang</a>
            <?php endif; ?>
            
            <?php if ($can_chat): ?>
                <a href="/admin/chat">Chat</a>
            <?php endif; ?>

            <?php if ($can_checkout): ?>
                <a href="/buyer/cart.php" class="cart">
                    Keranjang
                    <?php if ($cart_count > 0): ?>
                    <span class="badge"><?= htmlspecialchars($cart_count) ?></span>
                    <?php endif; ?>
                </a>
            <?php endif; ?>
            
            <a href="#" id="balance-link">
                Balance: Rp <?= number_format($balance ?? 0, 0, ',', '.') ?>
            </a>

            <div class="dropdown">
                <button id="dropdownToggle" class="dropdown-toggle"><?= htmlspecialchars($name) ?></button>
                <div id="dropdownMenu" class="dropdown-content">
                    <a href="/buyer/profile.php">Profile</a>
                    <a href="/buyer/orders.php">Order History</a>
                    <a href="/authentication/logout.php">Logout</a>
                </div>
            </div>

        <?php elseif ($role === 'SELLER'): ?>
            <?php
                // Fetch active auction for seller
                $seller_auction_id = null;
                // Optimization: Hanya query jika fitur lelang aktif
                if (isset($_SESSION['user_id']) && $can_auction) {
                    require_once __DIR__ . '/../config/db.php';
                    $stmt = $conn->prepare("SELECT store_id FROM stores WHERE user_id = ?");
                    $stmt->bind_param("i", $_SESSION['user_id']);
                    $stmt->execute();
                    $store_res = $stmt->get_result()->fetch_assoc();
                    
                    if ($store_res) {
                        $store_id = $store_res['store_id'];
                        $stmt = $conn->prepare("
                            SELECT a.auction_id 
                            FROM auctions a
                            JOIN products p ON a.product_id = p.product_id
                            WHERE p.store_id = ? 
                            AND a.status IN ('active', 'scheduled')
                            LIMIT 1
                        ");
                        $stmt->bind_param("i", $store_id);
                        $stmt->execute();
                        $auction_res = $stmt->get_result()->fetch_assoc();
                        if ($auction_res) {
                            $seller_auction_id = $auction_res['auction_id'];
                        }
                    }
                }
            ?>
            <a href="/seller/dashboard.php">Dashboard</a>
            
            <?php if ($can_auction): ?>
                <a href="/auction/management">Lelang</a>
            <?php endif; ?>
            
            <a href="/seller/kelola_produk.php">Kelola Produk</a>
            
            <?php if ($can_chat): ?>
                <a href="/admin/chat">Chat</a>
            <?php endif; ?>

            <?php if ($seller_auction_id && $can_auction): ?>
                <a href="/admin/auction/<?= $seller_auction_id ?>">Auction</a>
            <?php endif; ?>
            
            <a href="/seller/order_management.php">Lihat Pesanan</a>
            <a href="/seller/tambah_produk.php">Tambah Produk</a>
            <a href="/authentication/logout.php">Logout</a>
        <?php endif; ?>
    </div>
</nav>

<?php if ($role === 'BUYER'): ?>
<div id="topup-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h3>Top Up Saldo</h3>
        <form id="topup-form">
            <label for="topup-amount">Jumlah Top Up (Rp):</label>
            <input type="number" id="topup-amount" name="amount" min="1000" required>
            <button type="submit">Top Up</button>
        </form>
    </div>
</div>
<?php endif; ?>