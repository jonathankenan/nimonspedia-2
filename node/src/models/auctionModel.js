
const dbPool = require('../config/db');

class AuctionModel {
  static async updateAuctionStatuses() {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update scheduled -> active
      await connection.query(`
        UPDATE auctions 
        SET status = 'active' 
        WHERE status = 'scheduled' AND start_time <= NOW()
  `);

      // 2. Find active auctions that have ended
      const [endedAuctions] = await connection.query(`
        SELECT a.*, p.store_id, p.product_name
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        WHERE a.status = 'active' AND a.end_time <= NOW()
        FOR UPDATE
  `);

      for (const auction of endedAuctions) {
        // Mark as ended
        await connection.query(
          'UPDATE auctions SET status = "ended" WHERE auction_id = ?',
          [auction.auction_id]
        );

        // If there is a winner, create order
        if (auction.winner_id) {
          const [users] = await connection.query(
            'SELECT address FROM users WHERE user_id = ?',
            [auction.winner_id]
          );

          if (users.length > 0) {
            const shippingAddress = users[0].address || 'Address not provided';

            // Create Order
            const [orderResult] = await connection.query(
              'INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status) VALUES (?, ?, ?, ?, ?)',
              [auction.winner_id, auction.store_id, auction.current_price, shippingAddress, 'approved']
            );
            const orderId = orderResult.insertId;

            // Create Order Item
            const priceAtOrder = auction.current_price / auction.quantity;
            await connection.query(
              'INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal) VALUES (?, ?, ?, ?, ?)',
              [orderId, auction.product_id, auction.quantity, priceAtOrder, auction.current_price]
            );
          }
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error('Error updating auction statuses:', error);
    } finally {
      connection.release();
    }
  }

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
          a.status AS db_status,
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
        ORDER BY a.start_time DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      const now = new Date();

      const auctions = rows.map(a => {
        const start = new Date(a.start_time);
        const end = a.end_time ? new Date(a.end_time) : null;

        let status = 'scheduled';

        if (a.db_status === 'cancelled') {
          status = 'cancelled';
        } else if (a.db_status === 'stopped') {
          status = 'ended';
        } else if (!end && now >= start) {
          // end_time null & sudah mulai → active
          status = 'active';
        } else if (end && now >= end) {
          status = 'ended';
        } else if (now >= start && (!end || now < end)) {
          status = 'active';
        }

        return { ...a, status };
      });

      return auctions;
    } catch (error) {
      console.error('Error fetching auctions:', error);
      throw error;
    }
  }

  static async getAuctionDetail(auctionId) {
    try {
      await this.updateAuctionStatuses();

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
          u.name AS seller_name,
          -- ambil waktu bid terakhir
          (SELECT MAX(bid_time) FROM auction_bids WHERE auction_id = a.auction_id) AS last_bid_time
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
        throw new Error(`Bid amount must be at least ${minBidAmount} `);
      }

      // Check if bidder has enough balance
      const [user] = await connection.query(
        'SELECT balance FROM users WHERE user_id = ? FOR UPDATE',
        [bidderId]
      );

      if (user.length === 0 || user[0].balance < bidAmount) {
        throw new Error('Insufficient balance');
      }

      // 1. Refund previous winner if exists
      if (currentAuction.winner_id) {
        await connection.query(
          'UPDATE users SET balance = balance + ? WHERE user_id = ?',
          [currentAuction.current_price, currentAuction.winner_id]
        );
      }

      // 2. Deduct balance from new bidder
      await connection.query(
        'UPDATE users SET balance = balance - ? WHERE user_id = ?',
        [bidAmount, bidderId]
      );

      // insert bid
      const [bidResult] = await connection.query(
        'INSERT INTO auction_bids (auction_id, bidder_id, bid_amount) VALUES (?, ?, ?)',
        [auctionId, bidderId, bidAmount]
      );

      // update current price
      let updateQuery = 'UPDATE auctions SET current_price = ?, winner_id = ?';
      const updateParams = [bidAmount, bidderId];

      // 15s Rule: If remaining time < 15s, extend it to 15s from now
      const now = new Date();
      const endTime = new Date(currentAuction.end_time);
      const diffSeconds = (endTime - now) / 1000;

      if (diffSeconds < 15) {
        const newEndTime = new Date(now.getTime() + 15000); // Add 15 seconds
        updateQuery += ', end_time = ?';
        updateParams.push(newEndTime);
      }

      updateQuery += ' WHERE auction_id = ?';
      updateParams.push(auctionId);

      await connection.query(updateQuery, updateParams);

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
        WHERE ab.bidder_id = ? AND a.status IN('active', 'scheduled')
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
  static async getUserBalance(userId) {
    try {
      const [rows] = await dbPool.query(
        'SELECT balance FROM users WHERE user_id = ?',
        [userId]
      );
      return rows.length > 0 ? rows[0].balance : 0;
    } catch (error) {
      console.error('Error fetching user balance:', error);
      throw error;
    }
  }
  static async stopAuction(auctionId, userId) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Get auction details and verify ownership
      const [rows] = await connection.query(`
        SELECT a.*, p.store_id, s.user_id as seller_id, p.product_name, p.main_image_path
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        WHERE a.auction_id = ?
  `, [auctionId]);

      if (rows.length === 0) {
        throw new Error('Auction not found');
      }

      const auction = rows[0];

      if (auction.seller_id !== userId) {
        throw new Error('Unauthorized: You are not the seller of this auction');
      }

      if (auction.status !== 'active') {
        throw new Error('Auction is not active');
      }

      // 2. Update auction status to 'ended'
      await connection.query(
        'UPDATE auctions SET status = "ended", end_time = NOW() WHERE auction_id = ?',
        [auctionId]
      );

      let orderId = null;
      let winnerInfo = null;

      // 3. If there is a winner, create an order
      if (auction.winner_id) {
        // Get winner details (address)
        const [users] = await connection.query(
          'SELECT user_id, name, email, address FROM users WHERE user_id = ?',
          [auction.winner_id]
        );

        if (users.length > 0) {
          const winner = users[0];
          winnerInfo = winner;
          const shippingAddress = winner.address || 'Address not provided';

          // Create Order
          const [orderResult] = await connection.query(
            'INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status) VALUES (?, ?, ?, ?, ?)',
            [winner.user_id, auction.store_id, auction.current_price, shippingAddress, 'approved']
          );
          orderId = orderResult.insertId;

          // Create Order Item
          // Calculate subtotal (price * quantity)
          const subtotal = auction.current_price * auction.quantity; // Assuming current_price is per unit? 
          // Wait, auction price usually is for the whole lot if quantity > 1? 
          // Or per unit? In `create - auction.php`, quantity is input.
          // Usually auctions are for the specific item(s).
          // If I bid 100000 for 5 items, is it 100000 total or each?
          // Standard auction logic: Price is for the LOT.
          // So price_at_order should be current_price / quantity? Or just current_price as total?
          // Let's assume current_price is the TOTAL price for the lot.
          // So price_at_order = current_price / quantity.
          // But to avoid float issues, let's just store current_price as subtotal?
          // `order_items` has `price_at_order` and `subtotal`.
          // If quantity is 1, price = current_price.
          // If quantity > 1, let's say price = current_price / quantity.

          const priceAtOrder = auction.current_price / auction.quantity;

          await connection.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal) VALUES (?, ?, ?, ?, ?)',
            [orderId, auction.product_id, auction.quantity, priceAtOrder, auction.current_price]
          );
        }
      }

      await connection.commit();

      return {
        success: true,
        auction_id: auctionId,
        status: 'ended',
        winner_id: auction.winner_id,
        order_id: orderId,
        winner_info: winnerInfo,
        product_name: auction.product_name
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error stopping auction:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = AuctionModel;