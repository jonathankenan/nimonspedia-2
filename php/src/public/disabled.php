<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Akses Dibatasi</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f4f7f6; margin: 0; }
        .box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1 { color: #dc2626; }
        .reason { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; margin: 15px 0; }
        a { text-decoration: none; color: white; background: #0A75BD; padding: 10px 20px; border-radius: 99px; }
    </style>
</head>
<body>
    <div class="box">
        <h1>⛔ Fitur Dinonaktifkan</h1>
        <p>Maaf, Anda tidak dapat mengakses fitur ini saat ini.</p>
        <?php if (!empty($_GET['reason'])): ?>
            <div class="reason">"<?= htmlspecialchars($_GET['reason']) ?>"</div>
        <?php endif; ?>
        <br>
        <a href="/index.php">Kembali ke Beranda</a>
    </div>
</body>
</html>