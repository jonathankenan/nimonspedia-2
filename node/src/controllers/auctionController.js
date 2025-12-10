const dbPool = require('../config/db'); 
const AuctionModel = require('../models/auctionModel');
const fetch = require('node-fetch');
const { broadcastMessage } = require('../utils/websocket');

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
    const auctionId = Number(req.params.auctionId);
    let { bid_amount } = req.body;
    const userId = req.user.user_id;
    const role = req.user.role;

    if (role !== 'BUYER') {
      return res.status(403).json({ error: "Unauthorized: only buyers can place bids" });
    }

    bid_amount = Number(bid_amount);
    if (!auctionId || !bid_amount || bid_amount <= 0) {
      return res.status(400).json({ error: "Missing or invalid bid parameters" });
    }

    const conn = await dbPool.getConnection();
    await conn.beginTransaction();

    try {
      // --- 1. Ambil auction + seller ---
      const [auctionRows] = await conn.query(`
        SELECT u.user_id AS seller_id, a.status, a.current_price, a.min_increment, a.starting_price, a.end_time
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        JOIN users u ON s.user_id = u.user_id
        WHERE a.auction_id = ?`, [auctionId]);

      const auction = auctionRows[0];
      if (!auction) {
        return res.status(404).json({ error: "Auction not found" });
      }
      if (auction.seller_id === userId) {
        return res.status(403).json({ error: "You cannot bid on your own auction" });
      }
      if (auction.status !== 'active' || new Date(auction.end_time) < new Date()) {
        return res.status(400).json({ error: "Auction is not active" });
      }

      const requiredMinBid = auction.current_price === 0 ? auction.starting_price : auction.current_price + auction.min_increment;
      if (bid_amount < requiredMinBid) {
        return res.status(400).json({ error: `Bid must be >= ${requiredMinBid}` });
      }

      // --- 2. Highest previous bid ---
      const [prevBidRows] = await conn.query(`
        SELECT bidder_id, bid_amount 
        FROM auction_bids 
        WHERE auction_id = ? 
        ORDER BY bid_amount DESC, bid_time ASC 
        LIMIT 1`, [auctionId]);
      const prevBid = prevBidRows[0] || null;

      // --- 3. User previous bid ---
      const [myPrevBidRows] = await conn.query(`
        SELECT bid_amount
        FROM auction_bids
        WHERE auction_id = ? AND bidder_id = ?
        ORDER BY bid_time DESC
        LIMIT 1`, [auctionId, userId]);
      const myPrevBidAmount = myPrevBidRows[0]?.bid_amount || 0;

      const amountToDeduct = bid_amount - myPrevBidAmount;
      if (amountToDeduct > 0) {
        await conn.query(`UPDATE users SET balance = balance - ? WHERE user_id = ?`, [amountToDeduct, userId]);
      }

      // --- 4. Refund previous bidder (bukan diri sendiri) ---
      if (prevBid && prevBid.bidder_id !== userId) {
        await conn.query(`UPDATE users SET balance = balance + ? WHERE user_id = ?`, [prevBid.bid_amount, prevBid.bidder_id]);
      }

      // --- 5. Update current_price ---
      await conn.query(`UPDATE auctions SET current_price = ? WHERE auction_id = ?`, [bid_amount, auctionId]);

      // --- 6. Insert new bid ---
      await conn.query(`
        INSERT INTO auction_bids (auction_id, bidder_id, bid_amount, bid_time)
        VALUES (?, ?, ?, NOW())`, [auctionId, userId, bid_amount]);

      await conn.commit();

      // --- 7. Notify Node.js WebSocket ---
      try {
        await fetch('http://node:3003/notify_bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'auction_bid_update',
            auction_id: auctionId,
            current_price: bid_amount,
            bidder_name: req.user.name
          })
        });
      } catch (err) {
        console.warn("Failed to notify WS:", err);
      }

      return res.json({ success: true });

    } catch (err) {
      await conn.rollback();
      console.error("Error placing bid:", err);
      return res.status(500).json({ error: "Failed to place bid" });
    } finally {
      conn.release();
    }
  }

  static async stopAuction(req, res) {
    const auctionId = Number(req.params.auctionId);
    const userId = req.user.user_id;
    const role = req.user.role;

    if (role !== 'SELLER') {
      return res.status(403).json({ error: "Unauthorized: only sellers can stop auctions" });
    }

    if (!auctionId) {
      return res.status(400).json({ error: "Missing auction_id" });
    }

    const conn = await dbPool.getConnection();
    await conn.beginTransaction();

    try {
      // --- 1. Update status auction ---
      await conn.query(
        `UPDATE auctions SET status = 'ended', end_time = NOW() WHERE auction_id = ?`,
        [auctionId]
      );

      // --- 2. Ambil highest bid ---
      const [highestBidRows] = await conn.query(
        `SELECT bidder_id, bid_amount 
         FROM auction_bids 
         WHERE auction_id = ? 
         ORDER BY bid_amount DESC, bid_time ASC 
         LIMIT 1`,
        [auctionId]
      );
      const highestBid = highestBidRows[0] || null;

      let orderId = null;

      if (highestBid) {
        const winnerId = highestBid.bidder_id;
        const amount = highestBid.bid_amount;

        // --- 3. Ambil store_id dari product ---
        const [storeRows] = await conn.query(
          `SELECT p.store_id 
           FROM products p
           JOIN auctions a ON p.product_id = a.product_id
           WHERE a.auction_id = ?`,
          [auctionId]
        );
        const storeId = storeRows[0]?.store_id;

        // --- 4. Ambil alamat buyer ---
        const [userRows] = await conn.query(
          `SELECT address FROM users WHERE user_id = ?`,
          [winnerId]
        );
        const shippingAddress = userRows[0]?.address || '';

        // --- 5. Insert order ---
        const [orderResult] = await conn.query(
          `INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status)
           VALUES (?, ?, ?, ?, 'approved')`,
          [winnerId, storeId, amount, shippingAddress]
        );
        orderId = orderResult.insertId;

        // --- 6. Update auction dengan winner_id ---
        await conn.query(
          `UPDATE auctions SET winner_id = ? WHERE auction_id = ?`,
          [winnerId, auctionId]
        );
      }

      await conn.commit();

      // --- 7. Notify WebSocket ---
      try {
        await fetch('http://node:3003/notify_bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'auction_stopped',
            auction_id: auctionId,
            order_id: orderId,
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn("Failed to notify WS:", err);
      }

      return res.json({
        success: true,
        message: 'Auction stopped successfully',
        data: { order_id: orderId }
      });

    } catch (err) {
      await conn.rollback();
      console.error("Error stopping auction:", err);
      return res.status(500).json({ error: "Failed to stop auction" });
    } finally {
      conn.release();
    }
  }
  
  static async cancelAuction(req, res) {
    const auctionId = Number(req.params.auctionId);
    const userId = req.user.user_id;
    const role = req.user.role;

    if (role !== 'SELLER') {
      return res.status(403).json({ error: "Unauthorized: only sellers can cancel auctions" });
    }

    if (!auctionId) {
      return res.status(400).json({ error: "Missing auction_id" });
    }

    const conn = await dbPool.getConnection();
    await conn.beginTransaction();

    try {
      // --- 1. Check if auction has any bids ---
      const [bidCountRows] = await conn.query(
        `SELECT COUNT(*) AS bid_count FROM auction_bids WHERE auction_id = ?`,
        [auctionId]
      );
      const bidCount = bidCountRows[0]?.bid_count || 0;

      if (bidCount > 0) {
        return res.status(400).json({ error: "Auction already has bids, cannot cancel" });
      }

      // --- 2. Cancel auction ---
      await conn.query(
        `UPDATE auctions SET status = 'cancelled', end_time = NOW() WHERE auction_id = ?`,
        [auctionId]
      );

      // --- 3. Rollback product stock ---
      const [auctionInfoRows] = await conn.query(
        `SELECT product_id, quantity FROM auctions WHERE auction_id = ?`,
        [auctionId]
      );
      const auctionInfo = auctionInfoRows[0];
      if (auctionInfo) {
        await conn.query(
          `UPDATE products SET stock = stock + ? WHERE product_id = ?`,
          [auctionInfo.quantity, auctionInfo.product_id]
        );
      }

      await conn.commit();

      // --- 4. Notify WebSocket ---
      try {
        await fetch('http://node:3003/notify_bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'auction_cancelled',
            auction_id: auctionId,
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn("Failed to notify WS:", err);
      }

      return res.json({
        success: true,
        message: "Auction cancelled successfully"
      });

    } catch (err) {
      await conn.rollback();
      console.error("Error cancelling auction:", err);
      return res.status(500).json({ error: "Failed to cancel auction" });
    } finally {
      conn.release();
    }
  }

  static async getUserActiveBids(req, res) {
    try {
      const userId = req.user.user_id;

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
      const userId = req.user.user_id;
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

  static async createAuction(req, res) {
    try {
      const userId = req.user.user_id;
      if (req.user.role !== 'SELLER') {
        return res.status(403).json({ error: "Unauthorized: only sellers can create auctions" });
      }

      const {
        product_id,
        starting_price,
        min_increment,
        quantity,
        start_time
      } = req.body;

      if (!product_id || !starting_price || !min_increment || !quantity || !start_time) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (starting_price <= 0 || min_increment <= 0 || quantity <= 0) {
        return res.status(400).json({ error: "Invalid numeric values" });
      }

      const conn = await dbPool.getConnection();
      await conn.beginTransaction();

      // --- 1. cek kepemilikan produk & stock ---
      const [productRows] = await conn.query(`
        SELECT p.product_id, p.stock, s.user_id AS owner_id
        FROM products p
        JOIN stores s ON p.store_id = s.store_id
        WHERE p.product_id = ?`, [product_id]);

      const [productInfoRows] = await conn.query(`
        SELECT p.product_name, s.store_name
        FROM products p
        JOIN stores s ON p.store_id = s.store_id
        WHERE p.product_id = ?`, [product_id]);
      
      const product = productRows[0];
      const productInfo = productInfoRows[0];
      if (!product) {
        await conn.rollback();
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.owner_id !== userId) {
        await conn.rollback();
        return res.status(403).json({ error: "Product does not belong to seller" });
      }
      if (quantity > product.stock) {
        await conn.rollback();
        return res.status(400).json({ error: "Not enough stock" });
      }

      // --- 2. hitung end_time default 1 jam ---
      const startDate = new Date(start_time);
      const endDate = new Date(startDate.getTime() + 60*60*1000); // +60 menit
      const now = new Date();
      let status = 'scheduled';
      if (startDate <= now) {
          status = 'active';
      }

      // --- 3. insert auction ---
      const [result] = await conn.query(`
        INSERT INTO auctions
          (product_id, starting_price, current_price, min_increment, quantity, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [product_id, starting_price, starting_price, min_increment, quantity, start_time, endDate, status]);

      const auction_id = result.insertId;

      // --- 4. kurangi stock produk ---
      await conn.query(`UPDATE products SET stock = stock - ? WHERE product_id = ?`, [quantity, product_id]);

      await conn.commit();

      // --- 5. Notify WS supaya buyer langsung lihat auction baru ---
      broadcastMessage({
        type: 'auction_created',
        auction_id,
        product_id,
        product_name: productInfo.product_name,
        store_name: productInfo.store_name,
        starting_price,
        current_price: starting_price,
        min_increment,
        quantity,
        start_time: new Date(start_time).toISOString(), // UTC-safe
        end_time: endDate.toISOString(),
        status: status
      });

      return res.json({
        success: true,
        data: {
          auction_id,
          product_id,
          product_name: productInfo.product_name,
          store_name: productInfo.store_name,
          starting_price,
          current_price: starting_price,
          min_increment,
          quantity,
          start_time,
          end_time: endDate.toISOString(),
          status: status
        }
      });

    } catch (err) {
      console.error("Error creating auction:", err);
      return res.status(500).json({ error: "Failed to create auction" });
    }
  }
}

module.exports = AuctionController;
