<?php
require_once(__DIR__ . '/../../../app/utils/session.php');
require_once(__DIR__ . '/../../../app/config/db.php');
require_once(__DIR__ . '/../../../app/models/order.php');

header('Content-Type: application/json');

try {
    // 1. Pastikan user adalah BUYER
    requireRole('BUYER');
    
    // 2. Hanya izinkan metode POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
        exit;
    }

    // 3. Ambil data JSON dari request body
    $input = json_decode(file_get_contents('php://input'), true);
    $orderId = $input['order_id'] ?? 0;

    if (empty($orderId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Order ID tidak valid.']);
        exit;
    }

    // 4. Panggil logika dari Model
    $orderModel = new \App\Models\Order($conn);
    $success = $orderModel->confirmReception((int)$orderId, $_SESSION['user_id']);

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Pesanan telah dikonfirmasi!']);
    } 
    // Jika gagal, model akan melempar exception

} catch (\Exception $e) {
    // 5. Tangkap error (misal: "barang belum sampai", "pesanan tidak ditemukan")
    http_response_code(400); // 400 Bad Request (logic error)
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>