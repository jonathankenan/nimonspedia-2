const AuctionModel = require('../models/auctionModel');
const checkAccess = require('../utils/featureAccess'); // (kenan) [ADDED] Import feature access helper

class AuctionController {
  
  // Helper internal untuk menangani response error feature flag
  static handleFeatureDenied(res, access) {
    return res.status(403).json({ 
      error: access.reason,
      redirect_url: `/disabled.php?reason=${encodeURIComponent(access.reason)}`
    });
  }

  static async getAuctions(req, res) {
    try {
      // [ADDED] Feature Flag Check
      const userId = req.user ? req.user.user_id : null;
      const access = await checkAccess(userId, 'auction_enabled');
      
      if (!access.allowed) {
        return AuctionController.handleFeatureDenied(res, access);
      }

      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const auctions = await AuctionModel.getActiveAuctions(limit, offset);

      res.json({
        success: true,
        data: auctions,
        pagination: { limit, offset }
      });
    } catch (error) {
      console.error('Error in getAuctions:', error);
      res.status(500).json({ error: 'Failed to fetch auctions' });
    }
  }

  static async getAuctionDetail(req, res) {
    try {
      // [ADDED] Feature Flag Check
      const userId = req.user ? req.user.user_id : null;
      const access = await checkAccess(userId, 'auction_enabled');
      
      if (!access.allowed) {
        return AuctionController.handleFeatureDenied(res, access);
      }

      const { auctionId } = req.params;

      const auction = await AuctionModel.getAuctionDetail(auctionId);

      if (!auction) {
        return res.status(404).json({ error: 'Auction not found' });
      }

      res.json({
        success: true,
        data: auction
      });
    } catch (error) {
      console.error('Error in getAuctionDetail:', error);
      res.status(500).json({ error: 'Failed to fetch auction detail' });
    }
  }

  static async getBidHistory(req, res) {
    try {
      // [ADDED] Feature Flag Check
      const userId = req.user ? req.user.user_id : null;
      const access = await checkAccess(userId, 'auction_enabled');
      
      if (!access.allowed) {
        return AuctionController.handleFeatureDenied(res, access);
      }

      const { auctionId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const bidHistory = await AuctionModel.getBidHistory(auctionId, limit);

      res.json({
        success: true,
        data: bidHistory
      });
    } catch (error) {
      console.error('Error in getBidHistory:', error);
      res.status(500).json({ error: 'Failed to fetch bid history' });
    }
  }

  static async placeBid(req, res) {
    try {
      // [ADDED] Feature Flag Check
      const userId = req.user.user_id;
      const access = await checkAccess(userId, 'auction_enabled');
      
      if (!access.allowed) {
        return AuctionController.handleFeatureDenied(res, access);
      }

      const { auctionId } = req.params;
      const { bidAmount } = req.body;
      const bidderId = req.user.user_id;

      // Validate input
      if (!auctionId || !bidAmount || bidAmount <= 0) {
        return res.status(400).json({ error: 'Invalid auction ID or bid amount' });
      }

      // Get previous highest bidder BEFORE placing new bid (for notification)
      const currentAuction = await AuctionModel.getAuctionDetail(auctionId);
      const previousWinnerId = currentAuction ? currentAuction.winner_id : null;

      const bid = await AuctionModel.placeBid(auctionId, bidderId, bidAmount);

      // Broadcast bid update
      const { broadcastMessage } = require('../utils/websocket');
      broadcastMessage({
        type: 'auction_bid_update',
        auction_id: auctionId,
        current_price: bidAmount,
        bidder_name: req.user.userName || 'Someone', 
        timestamp: new Date().toISOString()
      });

      // Send Outbid Notification
      if (previousWinnerId && previousWinnerId !== bidderId) {
        broadcastMessage({
          type: 'notification_outbid',
          auction_id: auctionId,
          user_id: previousWinnerId, // Target user
          product_name: currentAuction.product_name,
          new_amount: bidAmount,
          message: `You have been outbid on ${currentAuction.product_name}!`
        });
      }

      res.json({
        success: true,
        message: 'Bid placed successfully',
        data: bid
      });
    } catch (error) {
      console.error('Error in placeBid:', error);
      res.status(400).json({ error: error.message || 'Failed to place bid' });
    }
  }

  static async stopAuction(req, res) {
    try {
      // [ADDED] Feature Flag Check
      const userId = req.user.user_id;
      const access = await checkAccess(userId, 'auction_enabled');
      
      if (!access.allowed) {
        return AuctionController.handleFeatureDenied(res, access);
      }

      const { auctionId } = req.params;
      
      const result = await AuctionModel.stopAuction(auctionId, userId);

      // Send Win Notification
      if (result.winner_id) {
        const { broadcastMessage } = require('../utils/websocket');
        broadcastMessage({
          type: 'notification_win',
          auction_id: auctionId,
          user_id: result.winner_id, // Target user
          product_name: result.product_name,
          message: `Congratulations! You won the auction for ${result.product_name}!`
        });
      }

      res.json({
        success: true,
        message: 'Auction stopped successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in stopAuction:', error);
      res.status(400).json({ error: error.message || 'Failed to stop auction' });
    }
  }

  static async getUserActiveBids(req, res) {
    try {
      // [ADDED] Feature Flag Check
      const userId = req.user.user_id;
      const access = await checkAccess(userId, 'auction_enabled');
      
      if (!access.allowed) {
        return AuctionController.handleFeatureDenied(res, access);
      }

      const bids = await AuctionModel.getUserActiveBids(userId);

      res.json({
        success: true,
        data: bids
      });
    } catch (error) {
      console.error('Error in getUserActiveBids:', error);
      res.status(500).json({ error: 'Failed to fetch user bids' });
    }
  }

  static async getUserBalance(req, res) {
    try {
      // [ADDED] Feature Flag Check
      const userId = req.user.user_id;
      const access = await checkAccess(userId, 'auction_enabled');
      
      if (!access.allowed) {
        return AuctionController.handleFeatureDenied(res, access);
      }

      const balance = await AuctionModel.getUserBalance(userId);

      res.json({
        success: true,
        data: { balance }
      });
    } catch (error) {
      console.error('Error in getUserBalance:', error);
      res.status(500).json({ error: 'Failed to fetch user balance' });
    }
  }
}

module.exports = AuctionController;