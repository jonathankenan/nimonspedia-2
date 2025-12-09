<?php
require_once __DIR__ . '/../../app/init.php';
require_once __DIR__ . '/../../app/utils/session.php';

requireLogin();

$feature = $_GET['feature'] ?? 'unknown';
$reason = $_GET['reason'] ?? 'Fitur ini sedang tidak tersedia';

$featureNames = [
    'chat' => 'Chat',
    'auction' => 'Lelang',
    'checkout' => 'Checkout'
];

$featureName = $featureNames[$feature] ?? 'Fitur';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fitur Tidak Tersedia - Nimonspedia</title>
    <link rel="stylesheet" href="/assets/css/feature-disabled.css">
</head>
<body>
    <?php include __DIR__ . '/../../app/components/navbar.php'; ?>

    <div class="disabled-container">
        <div class="disabled-content">
            <div class="disabled-icon">🚫</div>
            <h1>Fitur <?php echo htmlspecialchars($featureName); ?> Tidak Tersedia</h1>
            <p class="reason"><?php echo htmlspecialchars($reason); ?></p>
            <a href="/" class="btn-back">Kembali ke Beranda</a>
        </div>
    </div>
</body>
</html>
