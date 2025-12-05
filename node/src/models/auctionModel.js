const dbPool = require('../config/db');

class AuctionModel {
  static async getActiveAuctions(limit = 20, offset = 0) {
    try {
      const [rows] = await dbPool.query(`
        SELECT 
          a.auction_id,
          a.product_id,
          a.starting_price,
          a.current_price,
          a.min_increment,
          a.quantity,
          a.start_time,
          a.end_time,
          a.status,
          a.winner_id,
          p.product_name,
          p.price AS original_price,
          p.main_image_path,
          s.store_id,
          s.store_name,
          u.name AS seller_name,
          (SELECT COUNT(*) FROM auction_bids WHERE auction_id = a.auction_id) AS bid_count
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        JOIN users u ON s.user_id = u.user_id
        WHERE a.status IN ('active', 'scheduled')
        ORDER BY a.start_time DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      return rows;
    } catch (error) {
      console.error('Error fetching active auctions:', error);
      throw error;
    }
  }

  static async getAuctionDetail(auctionId) {
    try {
      const [rows] = await dbPool.query(`
        SELECT 
          a.auction_id,
          a.product_id,
          a.starting_price,
          a.current_price,
          a.min_increment,
          a.quantity,
          a.start_time,
          a.end_time,
          a.status,
          a.winner_id,
          a.created_at,
          p.product_name,
          p.description,
          p.price AS original_price,
          p.main_image_path,
          s.store_id,
          s.store_name,
          u.user_id AS seller_id,
          u.name AS seller_name
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        JOIN users u ON s.user_id = u.user_id
        WHERE a.auction_id = ?
      `, [auctionId]);

      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error fetching auction detail:', error);
      throw error;
    }
  }

  static async getBidHistory(auctionId, limit = 50) {
    try {
      const [rows] = await dbPool.query(`
        SELECT 
          ab.bid_id,
          ab.bid_amount,
          ab.bid_time,
          u.user_id AS bidder_id,
          u.name AS bidder_name,
          u.email AS bidder_email
        FROM auction_bids ab
        JOIN users u ON ab.bidder_id = u.user_id
        WHERE ab.auction_id = ?
        ORDER BY ab.bid_time DESC
        LIMIT ?
      `, [auctionId, limit]);

      return rows;
    } catch (error) {
      console.error('Error fetching bid history:', error);
      throw error;
    }
  }

  static async placeBid(auctionId, bidderId, bidAmount) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      // cek kalau auction aktif
      const [auction] = await connection.query(
        'SELECT * FROM auctions WHERE auction_id = ? AND status = "active"',
        [auctionId]
      );

      if (auction.length === 0) {
        throw new Error('Auction not found or not active');
      }

      const currentAuction = auction[0];

      // validasi jumlah bid
      const minBidAmount = currentAuction.current_price === 0 
        ? currentAuction.starting_price 
        : currentAuction.current_price + currentAuction.min_increment;

      if (bidAmount < minBidAmount) {
        throw new Error(`Bid amount must be at least ${minBidAmount}`);
      }

      // Check if bidder has enough balance
      const [user] = await connection.query(
        'SELECT balance FROM users WHERE user_id = ?',
        [bidderId]
      );

      if (user.length === 0 || user[0].balance < bidAmount) {
        throw new Error('Insufficient balance');
      }

      // insert bid
      const [bidResult] = await connection.query(
        'INSERT INTO auction_bids (auction_id, bidder_id, bid_amount) VALUES (?, ?, ?)',
        [auctionId, bidderId, bidAmount]
      );

      // update current price
      await connection.query(
        'UPDATE auctions SET current_price = ?, winner_id = ? WHERE auction_id = ?',
        [bidAmount, bidderId, auctionId]
      );

      await connection.commit();

      return {
        bid_id: bidResult.insertId,
        auction_id: auctionId,
        bidder_id: bidderId,
        bid_amount: bidAmount,
        bid_time: new Date().toISOString()
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error placing bid:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getUserActiveBids(userId) {
    try {
      const [rows] = await dbPool.query(`
        SELECT 
          a.auction_id,
          a.product_id,
          a.current_price,
          a.status,
          a.end_time,
          p.product_name,
          p.main_image_path,
          s.store_name,
          MAX(ab.bid_amount) AS user_highest_bid
        FROM auction_bids ab
        JOIN auctions a ON ab.auction_id = a.auction_id
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        WHERE ab.bidder_id = ? AND a.status IN ('active', 'scheduled')
        GROUP BY a.auction_id
        ORDER BY a.end_time ASC
      `, [userId]);

      return rows;
    } catch (error) {
      console.error('Error fetching user active bids:', error);
      throw error;
    }
  }

  static async getAuctionByProductId(productId) {
    try {
      const [rows] = await dbPool.query(
        'SELECT * FROM auctions WHERE product_id = ? LIMIT 1',
        [productId]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error fetching auction by product ID:', error);
      throw error;
    }
  }
}

module.exports = AuctionModel;
