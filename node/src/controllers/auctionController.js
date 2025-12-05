const AuctionModel = require('../models/auctionModel');

class AuctionController {
  static async getAuctions(req, res) {
    try {
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
      const { auctionId } = req.params;
      const { bidAmount } = req.body;
      const bidderId = req.user.userId;

      // Validate input
      if (!auctionId || !bidAmount || bidAmount <= 0) {
        return res.status(400).json({ error: 'Invalid auction ID or bid amount' });
      }

      const bid = await AuctionModel.placeBid(auctionId, bidderId, bidAmount);
      
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

  static async getUserActiveBids(req, res) {
    try {
      const userId = req.user.userId;

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
}

module.exports = AuctionController;
