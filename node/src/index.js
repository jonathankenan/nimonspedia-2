require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');

// Import configurations
const dbPool = require('./config/db');
const redisClient = require('./config/redis');

// Import routes
const adminRoutes = require('./routes/admin');
const auctionRoutes = require('./routes/auction');
const chatRoutes = require('./routes/chat');
const pushRoutes = require('./routes/push');

// Import WebSocket utilities
const { initializeWebSocket, broadcastMessage } = require('./utils/websocket');
const { initializeChatWebSocket } = require('./utils/chatWebSocket');

// Express App for REST API
const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// =====================
// REST API ROUTES
// =====================

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/push', pushRoutes);

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
  console.log(`✅ REST API running on port ${PORT}`);
});

// Create HTTP server for Socket.IO (Chat WebSocket)
const chatServer = http.createServer();
initializeChatWebSocket(chatServer);

chatServer.listen(WS_PORT, () => {
  console.log(`✅ Chat WebSocket server running on port ${WS_PORT}`);
});

// Start legacy WebSocket server (for Auction)
const AUCTION_WS_PORT = process.env.AUCTION_WS_PORT || 3002;
const wss = initializeWebSocket(AUCTION_WS_PORT);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing servers...');
  await dbPool.end();
  await redisClient.quit();
  wss.close();
  chatServer.close();
  process.exit(0);
});