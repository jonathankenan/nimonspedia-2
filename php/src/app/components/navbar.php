<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$role = $_SESSION['role'] ?? null;
$name = $_SESSION['name'] ?? 'Guest';
$balance = $_SESSION['balance'] ?? 0;
$cart_count = $_SESSION['cart_count'] ?? 0;
?>

<link rel="stylesheet" href="/assets/css/navbar.css">
<script src="/assets/js/dropdown.js" defer></script>
<script src="/assets/js/topup.js" defer></script>

<nav>
    <div class="nav-left">
        <?php if ($role === 'SELLER'): ?>
        <a href="/seller/dashboard.php">Nimonspedia</a>
        <?php elseif ($role === 'BUYER'): ?>
        <a href="/buyer/dashboard.php">Nimonspedia</a>
        <?php else: ?>
        <a href="/index.php">Nimonspedia</a>
        <?php endif; ?>
    </div>

    <div class="nav-right">
        <?php if (!$role): ?>
            <!-- Guest -->
            <a href="/buyer/dashboard.php">Home</a>
            <a href="/authentication/login.php">Login</a>
            <a href="/authentication/register_role.php">Daftar</a>

        <?php elseif ($role === 'BUYER'): ?>
            <!-- Buyer -->
            <a href="/buyer/cart.php" class="cart">
                🛍 Cart
                <?php if ($cart_count > 0): ?>
                <span class="badge"><?= htmlspecialchars($cart_count) ?></span>
                <?php endif; ?>
            </a>

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
            <!-- Seller -->
            <a href="/seller/dashboard.php">Dashboard</a>
            <a href="/seller/products.php">Produk</a>
            <a href="/seller/orders.php">Orders</a>

            <span>Balance: Rp <?= number_format($balance ?? 0, 0, ',', '.') ?></span>
            <a href="/authentication/logout.php">Logout</a>
        <?php endif; ?>
    </div>
</nav>

<?php if ($role === 'BUYER'): ?>
<div id="topup-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h3>Top Up Balance</h3>
        <form id="topup-form">
            <label for="topup-amount">Jumlah Top Up (Rp)</label>
            <input type="number" id="topup-amount" name="amount" min="1000" required>
            <button type="submit">Top Up</button>
        </form>
        <p id="topup-msg" style="color:red;"></p>
    </div>
</div>
<?php endif; ?>
