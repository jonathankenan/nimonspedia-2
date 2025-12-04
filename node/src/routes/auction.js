const express = require('express');
const router = express.Router();
const AuctionController = require('../controllers/auctionController');
const { verifyToken } = require('../middleware/auth');

// Get all active auctions (for buyers to browse)
router.get('/list', AuctionController.getAuctions);

// Get auction detail by ID
router.get('/:auctionId', AuctionController.getAuctionDetail);

// Get bid history for an auction
router.get('/:auctionId/bids', AuctionController.getBidHistory);

// Place a bid
router.post('/:auctionId/bid', verifyToken, AuctionController.placeBid);

// Get user's active bids
router.get('/user/active-bids', verifyToken, AuctionController.getUserActiveBids);

module.exports = router;
