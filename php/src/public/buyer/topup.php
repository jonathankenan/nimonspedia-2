<?php
session_start();
header('Content-Type: application/json');

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    echo json_encode(['success'=>false,'message'=>'Invalid request']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$amount = (int)($input['amount'] ?? 0);

if($amount < 1000){
    echo json_encode(['success'=>false,'message'=>'Minimal top up Rp 1.000']);
    exit;
}

if(!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'BUYER'){
    echo json_encode(['success'=>false,'message'=>'Unauthorized']);
    exit;
}

include_once(__DIR__ . '/../../app/config/db.php');

$user_id = $_SESSION['user_id'];

$stmt = $conn->prepare("UPDATE users SET balance = balance + ? WHERE user_id = ?");
$stmt->bind_param('ii', $amount, $user_id);
if($stmt->execute()){
    $_SESSION['balance'] += $amount;
    echo json_encode(['success'=>true,'new_balance'=>$_SESSION['balance']]);
} else {
    echo json_encode(['success'=>false,'message'=>'Gagal update balance']);
}
$stmt->close();
$conn->close();