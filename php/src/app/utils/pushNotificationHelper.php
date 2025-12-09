<?php
namespace App\Utils;

/**
 * Helper untuk trigger push notifications via Node.js API
 */
class PushNotificationHelper {
    private static $apiUrl = 'http://node:3000/api/push';

    /**
     * Send chat notification
     */
    public static function sendChatNotification($recipientId, $senderName, $messageContent, $chatData) {
        return self::sendRequest('/send-chat', [
            'recipientId' => $recipientId,
            'senderName' => $senderName,
            'messageContent' => $messageContent,
            'chatData' => $chatData
        ]);
    }

    /**
     * Send order notification
     */
    public static function sendOrderNotification($userId, $status, $orderId, $role) {
        return self::sendRequest('/send-order', [
            'userId' => $userId,
            'status' => $status,
            'orderId' => $orderId,
            'role' => $role
        ]);
    }

    /**
     * Send auction notification
     */
    public static function sendAuctionNotification($userId, $message, $auctionId) {
        return self::sendRequest('/send-auction', [
            'userId' => $userId,
            'message' => $message,
            'auctionId' => $auctionId
        ]);
    }

    /**
     * Make HTTP request to Node.js API
     */
    private static function sendRequest($endpoint, $data) {
        $url = self::$apiUrl . $endpoint;
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($error) {
            error_log("Push notification error: $error");
            return false;
        }

        if ($httpCode !== 200) {
            error_log("Push notification failed with HTTP $httpCode");
            return false;
        }

        return true;
    }
}
