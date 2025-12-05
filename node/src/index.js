require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import configurations
const dbPool = require('./config/db');
const redisClient = require('./config/redis');

// Import routes
const adminRoutes = require('./routes/admin');
const auctionRoutes = require('./routes/auction');

// Import WebSocket utilities
const { initializeWebSocket, broadcastMessage } = require('./utils/websocket');

// Express App for REST API
const app = express();
app.use(cors());
app.use(express.json());

// =====================
// REST API ROUTES
// =====================

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/auction', auctionRoutes);

// Health check for root
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'Nimonspedia Node.js Backend',
    timestamp: new Date().toISOString()
  });
});

// =====================
// START SERVERS
// =====================

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Start REST API server
app.listen(PORT, () => {
  console.log(`✅ Admin REST API running on port ${PORT}`);
});

// Start WebSocket server
const wss = initializeWebSocket(WS_PORT);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing servers...');
  await dbPool.end();
  await redisClient.quit();
  wss.close();
  process.exit(0);
});