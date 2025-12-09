const express = require('express');
const router = express.Router();
const { authenticateRest } = require('../middleware/sessionAuth');

// GET /api/sessiondata
router.get('/sessiondata', authenticateRest, (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: {
      user_id: user.user_id,
      name: user.name,
      role: user.role,
      store_id: user.store_id || null
    }
  });
});

module.exports = router;
