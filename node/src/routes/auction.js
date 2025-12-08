const express = require('express');
const router = express.Router();
const AuctionController = require('../controllers/auctionController');
const { verifyToken } = require('../middleware/auth');
const { authenticateRest } = require('../middleware/sessionAuth');

// Get all active auctions (for buyers to browse)
router.get('/list', AuctionController.getAuctions);

// Get auction detail by ID
router.get('/:auctionId', AuctionController.getAuctionDetail);

// Get bid history for an auction
router.get('/:auctionId/bids', AuctionController.getBidHistory);

// Place a bid
router.post('/:auctionId/bid', authenticateRest, AuctionController.placeBid);

// Stop auction (Seller only)
router.post('/:auctionId/stop', verifyToken, AuctionController.stopAuction);

// Cancel auction (Seller only)
router.post('/:auctionId/cancel', verifyToken, AuctionController.cancelAuction);

// Get user's active bids
router.get('/user/active-bids', verifyToken, AuctionController.getUserActiveBids);

// Get user balance
router.get('/user/balance', verifyToken, AuctionController.getUserBalance);

module.exports = router;
