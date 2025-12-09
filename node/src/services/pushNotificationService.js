const webPush = require('web-push');
const dbPool = require('../config/db');

// Configure web-push with VAPID keys
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@nimonspedia.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send push notification to specific user
 * @param {number} userId - User ID to send notification to
 * @param {object} payload - Notification payload { title, body, data, icon, badge }
 * @param {string} category - Notification category: 'chat', 'auction', 'order'
 */
async function sendPushNotification(userId, payload, category = 'chat') {
  try {
    // Get user's push preferences
    const [prefs] = await dbPool.query(
      'SELECT chat_enabled, auction_enabled, order_enabled FROM push_preferences WHERE user_id = ?',
      [userId]
    );

    // Check if user has disabled this category
    if (prefs.length > 0) {
      const categoryEnabled = prefs[0][`${category}_enabled`];
      if (!categoryEnabled) {
        console.log(`[Push] User ${userId} has disabled ${category} notifications`);
        return { ok: true, sent: 0, message: 'User has disabled this category' };
      }
    }

    // Get all push subscriptions for this user
    const [subscriptions] = await dbPool.query(
      'SELECT subscription_id, endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      console.log(`[Push] No subscriptions found for user ${userId}`);
      return { ok: true, sent: 0, message: 'No subscriptions found' };
    }

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        };

        try {
          const payloadString = JSON.stringify(payload);
          console.log(`[Push] Sending to subscription ${sub.subscription_id}`);
          console.log(`[Push] Payload:`, payloadString);
          console.log(`[Push] Endpoint:`, pushSubscription.endpoint.substring(0, 60) + '...');
          
          const result = await webPush.sendNotification(
            pushSubscription,
            payloadString
          );
          console.log(`[Push] ✅ Sent successfully to subscription ${sub.subscription_id}`);
          console.log(`[Push] Response status:`, result.statusCode);
          return { success: true, subscriptionId: sub.subscription_id };
        } catch (error) {
          console.error(`[Push] Failed to send to subscription ${sub.subscription_id}:`, error);

          // If subscription is invalid (410 Gone or 404), remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[Push] Removing invalid subscription ${sub.subscription_id}`);
            await dbPool.query(
              'DELETE FROM push_subscriptions WHERE subscription_id = ?',
              [sub.subscription_id]
            );
          }

          return { success: false, subscriptionId: sub.subscription_id, error };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    return {
      ok: true,
      sent: successCount,
      total: subscriptions.length,
      message: `Sent ${successCount}/${subscriptions.length} notifications`
    };
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return {
      ok: false,
      sent: 0,
      message: error.message
    };
  }
}

/**
 * Send chat notification when new message arrives
 * @param {number} recipientId - User ID of the recipient
 * @param {string} senderName - Name of the sender
 * @param {string} messageContent - Message content preview
 * @param {object} chatData - Additional chat data { storeId, buyerId }
 */
async function sendChatNotification(recipientId, senderName, messageContent, chatData) {
  const payload = {
    title: `New message from ${senderName}`,
    body: messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/badge.png',
    tag: `chat-${chatData.storeId}-${chatData.buyerId}`,
    data: {
      type: 'chat',
      url: `/admin/chat`,
      storeId: chatData.storeId,
      buyerId: chatData.buyerId
    }
  };

  return await sendPushNotification(recipientId, payload, 'chat');
}

/**
 * Send order notification when order status changes
 * @param {number} userId - User ID to notify
 * @param {string} status - New order status
 * @param {number} orderId - Order ID
 * @param {string} role - User role ('BUYER' or 'SELLER')
 */
async function sendOrderNotification(userId, status, orderId, role) {
  const statusMessages = {
    BUYER: {
      approved: 'Your order has been approved',
      rejected: 'Your order has been rejected',
      on_delivery: 'Your order is on delivery',
      received: 'Order marked as received'
    },
    SELLER: {
      waiting_approval: 'New order waiting for approval',
      received: 'Buyer confirmed order receipt'
    }
  };

  const message = statusMessages[role]?.[status] || `Order status updated to ${status}`;

  const payload = {
    title: 'Order Update',
    body: `Order #${orderId}: ${message}`,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/badge.png',
    tag: `order-${orderId}`,
    data: {
      type: 'order',
      url: role === 'BUYER' ? '/buyer/orders.php' : '/seller/dashboard.php',
      orderId
    }
  };

  return await sendPushNotification(userId, payload, 'order');
}

/**
 * Send auction notification
 * @param {number} userId - User ID to notify
 * @param {string} message - Notification message
 * @param {number} auctionId - Auction ID
 */
async function sendAuctionNotification(userId, message, auctionId) {
  const payload = {
    title: 'Auction Update',
    body: message,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/badge.png',
    tag: `auction-${auctionId}`,
    data: {
      type: 'auction',
      url: '/admin/auctions',
      auctionId
    }
  };

  return await sendPushNotification(userId, payload, 'auction');
}

module.exports = {
  sendPushNotification,
  sendChatNotification,
  sendOrderNotification,
  sendAuctionNotification
};
