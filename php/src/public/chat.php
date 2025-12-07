<?php
include_once(__DIR__ . '/../app/utils/session.php');

requireLogin();
// Chat accessible for both buyer and seller
requireRole(['BUYER', 'SELLER']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat | Nimonspedia</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    
    <style>
        body {
            margin: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #f5f5f5;
        }
        #chat-root {
            height: calc(100vh - 80px); /* Adjust based on navbar height */
        }
    </style>
    
    <script>
        // Pass PHP session data to React via localStorage
        localStorage.setItem('userRole', <?php echo json_encode($_SESSION['role']); ?>);
        localStorage.setItem('userName', <?php echo json_encode($_SESSION['name']); ?>);
        localStorage.setItem('user_id', <?php echo json_encode($_SESSION['user_id']); ?>);
    </script>
</head>
<body>
    <?php include_once(__DIR__ . '/../app/components/navbar.php'); ?>

    <div id="chat-root"></div>

    <script type="module" src="/admin/@vite/client"></script>
    <script type="module" src="/admin/src/chat-standalone.jsx"></script>
</body>
</html>
