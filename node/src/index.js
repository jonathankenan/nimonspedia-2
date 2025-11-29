require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Express App for Admin REST API
const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

// =====================
// REST API ENDPOINTS
// =====================

// Health check
app.get('/api/admin/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Node.js Admin API',
    timestamp: new Date().toISOString() 
  });
});

// Get dashboard stats
app.get('/api/admin/stats', async (req, res) => {
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
});

// Get recent orders
app.get('/api/admin/orders/recent', async (req, res) => {
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
});

// Get all users
app.get('/api/admin/users', async (req, res) => {
  try {
    const [users] = await dbPool.query(`
      SELECT 
        user_id,
        email,
        name,
        role,
        balance,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Feature flags management
app.get('/api/admin/features', async (req, res) => {
  try {
    const features = await redisClient.hGetAll('feature_flags');
    res.json(features || {});
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

app.post('/api/admin/features/:featureName', async (req, res) => {
  try {
    const { featureName } = req.params;
    const { enabled } = req.body;
    
    await redisClient.hSet('feature_flags', featureName, enabled ? '1' : '0');
    
    // Broadcast to all WebSocket clients
    broadcastMessage({
      type: 'feature_update',
      feature: featureName,
      enabled
    });

    res.json({ success: true, feature: featureName, enabled });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// =====================
// WEBSOCKET SERVER
// =====================

const wss = new WebSocket.Server({ port: process.env.WS_PORT });
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Nimonspedia WebSocket Server',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);

      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'chat':
          // Broadcast chat message to all clients
          broadcastMessage({
            type: 'chat',
            userId: data.userId,
            message: data.message,
            timestamp: new Date().toISOString()
          });
          break;

        case 'order_update':
          // Notify relevant users about order updates
          broadcastMessage({
            type: 'order_update',
            orderId: data.orderId,
            status: data.status,
            timestamp: new Date().toISOString()
          });
          break;

        case 'auction_bid':
          // Handle auction bid
          broadcastMessage({
            type: 'auction_bid',
            auctionId: data.auctionId,
            bidAmount: data.bidAmount,
            userId: data.userId,
            timestamp: new Date().toISOString()
          });
          break;

        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to process message' 
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast message to all connected clients
function broadcastMessage(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// =====================
// START SERVERS
// =====================

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Admin REST API running on port ${PORT}`);
});

console.log(`✅ WebSocket Server running on port ${WS_PORT}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing servers...');
  await dbPool.end();
  await redisClient.quit();
  wss.close();
  process.exit(0);
});
