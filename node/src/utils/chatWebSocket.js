const { Server } = require('socket.io');
const dbPool = require('../config/db');
const { authenticateWebSocket } = require('../middleware/sessionAuth');

let io;
const userSockets = new Map(); // Map<user_id, Set<socket_id>>
const roomSockets = new Map(); // Map<"storeId:buyerId", Set<socket_id>>

/**
 * Initialize Socket.IO server for chat
 */
function initializeChatWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    },
    path: '/socket.io/'
  });

  // Authentication middleware
  io.use(authenticateWebSocket);

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`Chat connected: ${user.name} (${user.role}) - Socket: ${socket.id}`);

    // Track user socket
    if (!userSockets.has(user.user_id)) {
      userSockets.set(user.user_id, new Set());
    }
    userSockets.get(user.user_id).add(socket.id);

    // Send connection confirmation
    socket.emit('connected', {
      user_id: user.user_id,
      name: user.name,
      role: user.role
    });

    // Join chat room
    socket.on('join_room', async (data) => {
      try {
        const { store_id, buyer_id } = data;
        const roomKey = `${store_id}:${buyer_id}`;

        // Verify user has access to this room
        if (user.role === 'BUYER' && user.user_id !== buyer_id) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }
        if (user.role === 'SELLER' && user.store_id !== store_id) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }

        socket.join(roomKey);
        
        // Track room socket
        if (!roomSockets.has(roomKey)) {
          roomSockets.set(roomKey, new Set());
        }
        roomSockets.get(roomKey).add(socket.id);

        console.log(`User ${user.name} joined room ${roomKey}`);
        socket.emit('room_joined', { store_id, buyer_id });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave chat room
    socket.on('leave_room', (data) => {
      const { store_id, buyer_id } = data;
      const roomKey = `${store_id}:${buyer_id}`;
      
      socket.leave(roomKey);
      
      if (roomSockets.has(roomKey)) {
        roomSockets.get(roomKey).delete(socket.id);
      }
      
      console.log(`User ${user.name} left room ${roomKey}`);
    });

    // New message
    socket.on('new_message', async (data) => {
      try {
        const { store_id, buyer_id, message_id } = data;
        const roomKey = `${store_id}:${buyer_id}`;

        // Fetch full message data
        const [messages] = await dbPool.execute(
          `SELECT 
            cm.message_id,
            cm.sender_id,
            u.name as sender_name,
            cm.message_type,
            cm.content,
            cm.product_id,
            p.product_name,
            p.price as product_price,
            p.main_image_path as product_image,
            cm.is_read,
            cm.created_at
          FROM chat_messages cm
          JOIN users u ON cm.sender_id = u.user_id
          LEFT JOIN products p ON cm.product_id = p.product_id
          WHERE cm.message_id = ?`,
          [message_id]
        );

        if (messages.length === 0) {
          return;
        }

        const message = messages[0];

        // Broadcast to all users in the room
        io.to(roomKey).emit('message_received', {
          store_id,
          buyer_id,
          message
        });

        // Notify the other user if they're not in the room
        const otherUserId = user.role === 'BUYER' 
          ? (await getStoreUserId(store_id))
          : buyer_id;

        if (otherUserId && userSockets.has(otherUserId)) {
          const otherUserInRoom = Array.from(roomSockets.get(roomKey) || [])
            .some(socketId => userSockets.get(otherUserId)?.has(socketId));

          if (!otherUserInRoom) {
            // Send notification to other user's sockets
            userSockets.get(otherUserId).forEach(socketId => {
              io.to(socketId).emit('new_message_notification', {
                store_id,
                buyer_id,
                message: {
                  message_id: message.message_id,
                  sender_name: message.sender_name,
                  content: message.content,
                  message_type: message.message_type
                }
              });
            });
          }
        }
      } catch (error) {
        console.error('New message broadcast error:', error);
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { store_id, buyer_id, is_typing } = data;
      const roomKey = `${store_id}:${buyer_id}`;

      // Broadcast to others in the room
      socket.to(roomKey).emit('user_typing', {
        store_id,
        buyer_id,
        user_id: user.user_id,
        user_name: user.name,
        is_typing
      });
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      try {
        const { store_id, buyer_id } = data;
        const roomKey = `${store_id}:${buyer_id}`;

        // Update in database
        await dbPool.execute(
          `UPDATE chat_messages 
           SET is_read = 1 
           WHERE store_id = ? AND buyer_id = ? AND sender_id != ? AND is_read = 0`,
          [store_id, buyer_id, user.user_id]
        );

        // Notify sender that messages were read
        io.to(roomKey).emit('messages_read', {
          store_id,
          buyer_id,
          reader_id: user.user_id
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Heartbeat/ping-pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Chat disconnected: ${user.name} - Socket: ${socket.id}`);

      // Remove from user sockets
      if (userSockets.has(user.user_id)) {
        userSockets.get(user.user_id).delete(socket.id);
        if (userSockets.get(user.user_id).size === 0) {
          userSockets.delete(user.user_id);
        }
      }

      // Remove from room sockets
      roomSockets.forEach((sockets, roomKey) => {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          roomSockets.delete(roomKey);
        }
      });
    });
  });

  console.log('✅ Chat WebSocket server initialized');
  return io;
}

/**
 * Get user_id of store owner
 */
async function getStoreUserId(storeId) {
  try {
    const [stores] = await dbPool.execute(
      'SELECT user_id FROM stores WHERE store_id = ?',
      [storeId]
    );
    return stores.length > 0 ? stores[0].user_id : null;
  } catch (error) {
    console.error('Get store user error:', error);
    return null;
  }
}

/**
 * Send push notification (otw... hiks...)
 */
async function sendPushNotification(userId, notification) {
  // TODO: Implement web push notification
  console.log(`Push notification for user ${userId}:`, notification);
}

module.exports = {
  initializeChatWebSocket
};
