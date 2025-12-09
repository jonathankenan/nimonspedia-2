const dbPool = require('../config/db');
const { 
  sendChatNotification, 
  sendOrderNotification, 
  sendAuctionNotification 
} = require('../services/pushNotificationService');

/**
 * Get VAPID public key for client-side subscription
 */
exports.getVapidPublicKey = async (req, res) => {
  try {
    res.json({
      ok: true,
      publicKey: process.env.VAPID_PUBLIC_KEY
    });
  } catch (error) {
    console.error('[Push] Error getting VAPID key:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to get VAPID public key'
    });
  }
};

/**
 * Subscribe user to push notifications
 * Body: { userId, subscription: { endpoint, keys: { p256dh, auth } } }
 */
exports.subscribe = async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    console.log('[Push] Subscribe request received for user:', userId);

    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      console.log('[Push] ❌ Missing required fields');
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields: userId, subscription'
      });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;
    console.log('[Push] Endpoint:', endpoint.substring(0, 50) + '...');

    // Check if subscription already exists
    const [existing] = await dbPool.query(
      'SELECT subscription_id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );

    if (existing.length > 0) {
      console.log('[Push] Subscription already exists');
      return res.json({
        ok: true,
        message: 'Subscription already exists'
      });
    }

    // Insert new subscription
    console.log('[Push] Inserting new subscription...');
    await dbPool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
       VALUES (?, ?, ?, ?)`,
      [userId, endpoint, p256dh, auth]
    );

    // Create default preferences if not exists
    const [prefExists] = await dbPool.query(
      'SELECT user_id FROM push_preferences WHERE user_id = ?',
      [userId]
    );

    if (prefExists.length === 0) {
      console.log('[Push] Creating default preferences...');
      await dbPool.query(
        `INSERT INTO push_preferences (user_id, chat_enabled, auction_enabled, order_enabled)
         VALUES (?, TRUE, TRUE, TRUE)`,
        [userId]
      );
    }

    console.log('[Push] ✅ Subscription saved successfully');
    res.json({
      ok: true,
      message: 'Subscribed to push notifications'
    });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to subscribe to push notifications'
    });
  }
};

/**
 * Unsubscribe user from push notifications
 * Body: { userId, endpoint }
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { userId, endpoint } = req.body;

    if (!userId || !endpoint) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields: userId, endpoint'
      });
    }

    await dbPool.query(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );

    res.json({
      ok: true,
      message: 'Unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to unsubscribe from push notifications'
    });
  }
};

/**
 * Get user's push notification preferences
 */
exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await dbPool.query(
      'SELECT chat_enabled, auction_enabled, order_enabled FROM push_preferences WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      // Return default preferences
      return res.json({
        ok: true,
        preferences: {
          chat_enabled: true,
          auction_enabled: true,
          order_enabled: true
        }
      });
    }

    res.json({
      ok: true,
      preferences: {
        chat_enabled: Boolean(rows[0].chat_enabled),
        auction_enabled: Boolean(rows[0].auction_enabled),
        order_enabled: Boolean(rows[0].order_enabled)
      }
    });
  } catch (error) {
    console.error('[Push] Get preferences error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to get push preferences'
    });
  }
};

/**
 * Update user's push notification preferences
 * Body: { chat_enabled, auction_enabled, order_enabled }
 */
exports.updatePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { chat_enabled, auction_enabled, order_enabled } = req.body;

    // Check if preferences exist
    const [exists] = await dbPool.query(
      'SELECT user_id FROM push_preferences WHERE user_id = ?',
      [userId]
    );

    if (exists.length === 0) {
      // Insert new preferences
      await dbPool.query(
        `INSERT INTO push_preferences (user_id, chat_enabled, auction_enabled, order_enabled)
         VALUES (?, ?, ?, ?)`,
        [userId, chat_enabled ?? true, auction_enabled ?? true, order_enabled ?? true]
      );
    } else {
      // Update existing preferences
      await dbPool.query(
        `UPDATE push_preferences 
         SET chat_enabled = ?, auction_enabled = ?, order_enabled = ?
         WHERE user_id = ?`,
        [chat_enabled ?? true, auction_enabled ?? true, order_enabled ?? true, userId]
      );
    }

    res.json({
      ok: true,
      message: 'Push preferences updated'
    });
  } catch (error) {
    console.error('[Push] Update preferences error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to update push preferences'
    });
  }
};

/**
 * API endpoint to send chat notification
 * Body: { recipientId, senderName, messageContent, chatData }
 */
exports.sendChatNotificationAPI = async (req, res) => {
  try {
    const { recipientId, senderName, messageContent, chatData } = req.body;

    if (!recipientId || !senderName || !messageContent || !chatData) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields'
      });
    }

    const result = await sendChatNotification(recipientId, senderName, messageContent, chatData);
    
    res.json(result);
  } catch (error) {
    console.error('[Push] Send chat notification error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to send chat notification'
    });
  }
};

/**
 * API endpoint to send order notification
 * Body: { userId, status, orderId, role }
 */
exports.sendOrderNotificationAPI = async (req, res) => {
  try {
    const { userId, status, orderId, role } = req.body;

    if (!userId || !status || !orderId || !role) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields'
      });
    }

    const result = await sendOrderNotification(userId, status, orderId, role);
    
    res.json(result);
  } catch (error) {
    console.error('[Push] Send order notification error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to send order notification'
    });
  }
};

/**
 * API endpoint to send auction notification
 * Body: { userId, message, auctionId }
 */
exports.sendAuctionNotificationAPI = async (req, res) => {
  try {
    const { userId, message, auctionId } = req.body;

    if (!userId || !message || !auctionId) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields'
      });
    }

    const result = await sendAuctionNotification(userId, message, auctionId);
    
    res.json(result);
  } catch (error) {
    console.error('[Push] Send auction notification error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to send auction notification'
    });
  }
};
