const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushNotificationController');

// Subscribe to push notifications
router.post('/subscribe', pushController.subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', pushController.unsubscribe);

// Get push preferences
router.get('/preferences/:userId', pushController.getPreferences);

// Update push preferences
router.put('/preferences/:userId', pushController.updatePreferences);

// Get VAPID public key
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Send notifications (called from PHP backend)
router.post('/send-chat', pushController.sendChatNotificationAPI);
router.post('/send-order', pushController.sendOrderNotificationAPI);
router.post('/send-auction', pushController.sendAuctionNotificationAPI);

module.exports = router;
