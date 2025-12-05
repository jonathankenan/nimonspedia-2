const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');

// Login
router.post('/login', AdminController.login);

// Health check
router.get('/health', AdminController.health);

// Dashboard stats
router.get('/stats', verifyToken, AdminController.getStats);

// Recent orders
router.get('/orders/recent', verifyToken, AdminController.getRecentOrders);

// Users management
router.get('/users', verifyToken, AdminController.getUsers);

// Feature flags (global)
router.get('/features', verifyToken, AdminController.getFeatures);
router.post('/features/:featureName', verifyToken, AdminController.updateFeature);

// User flags
router.get('/users/:userId/flags', verifyToken, AdminController.getUserFlags);
router.post('/users/:userId/flags', verifyToken, AdminController.updateUserFlag);

module.exports = router;
