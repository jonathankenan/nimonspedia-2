const dbPool = require('../config/db');
const redisClient = require('../config/redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AdminController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const [users] = await dbPool.query(
        "SELECT * FROM users WHERE email = ? AND role = 'ADMIN'", 
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Email tidak ditemukan atau bukan Admin' });
      }

      const user = users[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Password salah' });
      }

      const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_negara_nimons';
      const token = jwt.sign(
        { userId: user.user_id, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({ 
        success: true, 
        token, 
        user: { name: user.name, email: user.email } 
      });

    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static health(req, res) {
    res.json({ 
      status: 'ok', 
      service: 'Node.js Admin API',
      timestamp: new Date().toISOString() 
    });
  }

  static async getStats(req, res) {
    try {
      const [users] = await dbPool.query('SELECT COUNT(*) as count FROM users');
      const [orders] = await dbPool.query('SELECT COUNT(*) as count FROM orders');
      const [products] = await dbPool.query('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL');
      const [revenue] = await dbPool.query(
        "SELECT SUM(total_price) as total FROM orders WHERE status = 'received'"
      );

      res.json({
        users: users[0].count,
        orders: orders[0].count,
        products: products[0].count,
        revenue: revenue[0].total || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  static async getRecentOrders(req, res) {
    try {
      const [orders] = await dbPool.query(`
        SELECT 
          o.order_id,
          o.total_price,
          o.status,
          o.created_at,
          u.name as buyer_name,
          s.store_name
        FROM orders o
        JOIN users u ON o.buyer_id = u.user_id
        JOIN stores s ON o.store_id = s.store_id
        ORDER BY o.created_at DESC
        LIMIT 10
      `);

      res.json(orders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
  }

  static async getUsers(req, res) {
    try {
      // 1. Ambil Parameter Pagination & Filter
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10; // Default 10 user per halaman
      const search = req.query.search || '';
      const roleFilter = req.query.role || 'ALL';
      const offset = (page - 1) * limit;

      // 2. Bangun Query Dasar (Dynamic SQL)
      let queryBase = "FROM users WHERE role != 'ADMIN'";
      const queryParams = [];

      // Filter Search (Nama atau Email)
      if (search) {
        queryBase += " AND (name LIKE ? OR email LIKE ?)";
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Filter Role (Buyer/Seller)
      if (roleFilter !== 'ALL') {
        queryBase += " AND role = ?";
        queryParams.push(roleFilter);
      }

      // 3. Hitung Total Data (Untuk Pagination)
      const [countResult] = await dbPool.query(
        `SELECT COUNT(*) as total ${queryBase}`, 
        queryParams
      );
      const totalItems = countResult[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      // 4. Ambil Data User (Dengan LIMIT & OFFSET)
      const dataParams = [...queryParams, limit, offset];
      
      const [users] = await dbPool.query(`
        SELECT 
          user_id, email, name, role, balance, created_at
        ${queryBase}
        ORDER BY user_id ASC
        LIMIT ? OFFSET ?
      `, dataParams);

      // 5. Kirim Response ke React
      res.json({
        data: users,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: totalItems,
          totalPages: totalPages
        }
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  static async getFeatures(req, res) {
    try {
      const features = await redisClient.hGetAll('feature_flags');
      res.json(features || {});
    } catch (error) {
      console.error('Error fetching features:', error);
      res.status(500).json({ error: 'Failed to fetch feature flags' });
    }
  }

  static async updateFeature(req, res) {
    try {
      const { featureName } = req.params;
      const { enabled, reason } = req.body;

      // Cek apakah data global sudah ada
      const [existing] = await dbPool.query(
        "SELECT access_id FROM user_feature_access WHERE user_id IS NULL AND feature_name = ?",
        [featureName]
      );

      if (existing.length > 0) {
        // Update data yang ada
        await dbPool.query(
          "UPDATE user_feature_access SET is_enabled = ?, reason = ? WHERE user_id IS NULL AND feature_name = ?",
          [enabled ? 1 : 0, reason || null, featureName]
        );
      } else {
        // Insert data baru
        await dbPool.query(
          "INSERT INTO user_feature_access (user_id, feature_name, is_enabled, reason) VALUES (NULL, ?, ?, ?)",
          [featureName, enabled ? 1 : 0, reason || null]
        );
      }
      
      // Simpan ke Redis juga (opsional, tapi bagus untuk performa Node.js lain)
      await redisClient.hSet('feature_flags', featureName, enabled ? '1' : '0');

      // (kenan) Broadcast feature disabled untuk auction_enabled via WebSocket
      if (!enabled && featureName === 'auction_enabled') {
        const { broadcastMessage } = require('../utils/websocket');
        broadcastMessage({
          type: 'feature_disabled',
          feature: featureName,
          reason: reason || 'Fitur lelang sedang dinonaktifkan',
          timestamp: new Date().toISOString()
        });
      }
      // udah
      
      res.json({ success: true, feature: featureName, enabled });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      res.status(500).json({ error: 'Failed to update feature flag' });
    }
  }

  static async getUserFlags(req, res) {
    try {
      const { userId } = req.params;
      const [rows] = await dbPool.query(
        "SELECT feature_name, is_enabled, reason FROM user_feature_access WHERE user_id = ?",
        [userId]
      );
      
      const flags = {
        checkout_enabled: { is_enabled: true, reason: null },
        chat_enabled: { is_enabled: true, reason: null },
        auction_enabled: { is_enabled: true, reason: null }
      };

      rows.forEach(row => {
        if (flags[row.feature_name]) {
          flags[row.feature_name] = {
            is_enabled: !!row.is_enabled,
            reason: row.reason
          };
        }
      });

      res.json(flags);
    } catch (error) {
      console.error('Error fetching user flags:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }

  static async updateUserFlag(req, res) {
    try {
      const { userId } = req.params;
      const { feature_name, is_enabled, reason } = req.body;

      const validFeatures = ['checkout_enabled', 'chat_enabled', 'auction_enabled'];
      if (!validFeatures.includes(feature_name)) {
        return res.status(400).json({ error: 'Invalid feature name' });
      }

      if (!is_enabled && (!reason || reason.length < 5)) {
        return res.status(400).json({ error: 'Alasan wajib diisi minimal 5 karakter saat mematikan fitur.' });
      }

      const [existing] = await dbPool.query(
        "SELECT access_id FROM user_feature_access WHERE user_id = ? AND feature_name = ?",
        [userId, feature_name]
      );

      if (existing.length > 0) {
        await dbPool.query(
          "UPDATE user_feature_access SET is_enabled = ?, reason = ? WHERE user_id = ? AND feature_name = ?",
          [is_enabled, reason || null, userId, feature_name]
        );
      } else {
        await dbPool.query(
          "INSERT INTO user_feature_access (user_id, feature_name, is_enabled, reason) VALUES (?, ?, ?, ?)",
          [userId, feature_name, is_enabled, reason || null]
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user flag:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }
}

module.exports = AdminController;
