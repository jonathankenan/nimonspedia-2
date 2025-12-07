const dbPool = require('../config/db');

// sanitize HTML to prevent XSS
function sanitizeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// get all chat room for user
async function getChatRooms(req, res) {
  try {
    const user = req.user;
    const { search } = req.query;

    let query, params;

    if (user.role === 'BUYER') {
      query = `
        SELECT 
          cr.store_id,
          cr.buyer_id,
          s.store_name,
          s.store_logo_path,
          cr.last_message_at,
          (SELECT content FROM chat_messages 
           WHERE store_id = cr.store_id AND buyer_id = cr.buyer_id 
           ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT message_type FROM chat_messages 
           WHERE store_id = cr.store_id AND buyer_id = cr.buyer_id 
           ORDER BY created_at DESC LIMIT 1) as last_message_type,
          (SELECT COUNT(*) FROM chat_messages cm2 
           WHERE cm2.store_id = cr.store_id 
           AND cm2.buyer_id = cr.buyer_id 
           AND cm2.sender_id != ? 
           AND cm2.is_read = 0) as unread_count
        FROM chat_rooms cr
        JOIN stores s ON cr.store_id = s.store_id
        WHERE cr.buyer_id = ?
        ${search ? 'AND s.store_name LIKE ?' : ''}
        ORDER BY cr.last_message_at DESC
      `;
      params = search ? [user.user_id, user.user_id, `%${search}%`] : [user.user_id, user.user_id];
    } else if (user.role === 'SELLER') {
      query = `
        SELECT 
          cr.store_id,
          cr.buyer_id,
          u.name as buyer_name,
          cr.last_message_at,
          (SELECT content FROM chat_messages 
           WHERE store_id = cr.store_id AND buyer_id = cr.buyer_id 
           ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT message_type FROM chat_messages 
           WHERE store_id = cr.store_id AND buyer_id = cr.buyer_id 
           ORDER BY created_at DESC LIMIT 1) as last_message_type,
          (SELECT COUNT(*) FROM chat_messages cm2 
           WHERE cm2.store_id = cr.store_id 
           AND cm2.buyer_id = cr.buyer_id 
           AND cm2.sender_id != ? 
           AND cm2.is_read = 0) as unread_count
        FROM chat_rooms cr
        JOIN users u ON cr.buyer_id = u.user_id
        WHERE cr.store_id = ?
        ${search ? 'AND u.name LIKE ?' : ''}
        ORDER BY cr.last_message_at DESC
      `;
      params = search ? [user.user_id, user.store_id, `%${search}%`] : [user.user_id, user.store_id];
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rooms] = await dbPool.execute(query, params);
    res.json({ rooms });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
}

// get messages for a chat room
async function getMessages(req, res) {
  try {
    const user = req.user;
    const { storeId, buyerId } = req.params;
    const { limit = 50, before } = req.query;

    console.log('getMessages params:', { storeId, buyerId, limit, before, userRole: user.role });

    // Validate parameters
    if (!storeId || !buyerId) {
      return res.status(400).json({ error: 'Missing storeId or buyerId' });
    }

    // Parse to integers
    const storeIdInt = parseInt(storeId);
    const buyerIdInt = parseInt(buyerId);
    const messageLimit = parseInt(limit) || 50;

    // Verify access
    if (user.role === 'BUYER' && buyerIdInt !== user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (user.role === 'SELLER' && user.store_id !== storeIdInt) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query and params based on pagination
    let query, params;
    
    if (before) {
      query = `
        SELECT 
          cm.message_id,
          cm.store_id,
          cm.buyer_id,
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
        WHERE cm.store_id = ? AND cm.buyer_id = ? AND cm.created_at < ?
        ORDER BY cm.created_at DESC
        LIMIT ?
      `;
      params = [storeIdInt, buyerIdInt, before, messageLimit];
    } else {
      query = `
        SELECT 
          cm.message_id,
          cm.store_id,
          cm.buyer_id,
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
        WHERE cm.store_id = ? AND cm.buyer_id = ?
        ORDER BY cm.created_at DESC
        LIMIT ?
      `;
      params = [storeIdInt, buyerIdInt, messageLimit];
    }

    console.log('Executing query with params:', params, 'types:', params.map(p => typeof p));

    const [messages] = await dbPool.query(query, params);
    
    // Reverse to get chronological order
    const reversedMessages = messages.reverse();
    
    res.json({ 
      messages: reversedMessages,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(messages.length / limit),
        totalMessages: messages.length,
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

// send new message
async function sendMessage(req, res) {
  try {
    const user = req.user;
    const { storeId, buyerId } = req.params;
    let { message_type, content, product_id } = req.body;

    // Parse to integers
    const storeIdInt = parseInt(storeId);
    const buyerIdInt = parseInt(buyerId);

    // Verify access
    if (user.role === 'BUYER' && buyerIdInt !== user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (user.role === 'SELLER' && user.store_id !== storeIdInt) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check feature flag
    const [featureCheck] = await dbPool.execute(
      `SELECT is_enabled FROM user_feature_access 
       WHERE user_id = ? AND feature_name = 'chat_enabled'`,
      [user.user_id]
    );

    if (featureCheck.length > 0 && !featureCheck[0].is_enabled) {
      return res.status(403).json({ error: 'Chat feature is disabled for your account' });
    }

    // Sanitize content to prevent XSS
    content = sanitizeHtml(content);

    // Validate message type
    const validTypes = ['text', 'image', 'item_preview'];
    if (!validTypes.includes(message_type)) {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // Ensure chat room exists
    await dbPool.execute(
      `INSERT INTO chat_rooms (store_id, buyer_id, last_message_at) 
       VALUES (?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE last_message_at = NOW()`,
      [storeIdInt, buyerIdInt]
    );

    // Insert message
    const [result] = await dbPool.execute(
      `INSERT INTO chat_messages (store_id, buyer_id, sender_id, message_type, content, product_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [storeIdInt, buyerIdInt, user.user_id, message_type, content, product_id || null]
    );

    // Get the created message
    const [messages] = await dbPool.execute(
      `SELECT 
        cm.message_id,
        cm.store_id,
        cm.buyer_id,
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
      [result.insertId]
    );

    res.status(201).json({ message: messages[0] });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

// mark as read
async function markAsRead(req, res) {
  try {
    const user = req.user;
    const { storeId, buyerId } = req.params;

    // Parse to integers
    const storeIdInt = parseInt(storeId);
    const buyerIdInt = parseInt(buyerId);

    // Verify access
    if (user.role === 'BUYER' && buyerIdInt !== user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (user.role === 'SELLER' && user.store_id !== storeIdInt) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark all messages from other user as read
    await dbPool.execute(
      `UPDATE chat_messages 
       SET is_read = 1 
       WHERE store_id = ? AND buyer_id = ? AND sender_id != ? AND is_read = 0`,
      [storeIdInt, buyerIdInt, user.user_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
}

// get list of stores for buyer to start new chat (search)
async function getStores(req, res) {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        s.store_id,
        s.store_name,
        s.store_description,
        s.store_logo_path
      FROM stores s
      ${search ? 'WHERE s.store_name LIKE ?' : ''}
      ORDER BY s.store_name
    `;

    const params = search ? [`%${search}%`] : [];
    const [stores] = await dbPool.execute(query, params);

    res.json({ stores });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
}

// create or get existing chat room
async function createChatRoom(req, res) {
  try {
    const user = req.user;
    const { storeId } = req.body;

    if (user.role !== 'BUYER') {
      return res.status(403).json({ error: 'Only buyers can create chat rooms' });
    }

    const storeIdInt = parseInt(storeId);

    // Verify store exists
    const [stores] = await dbPool.execute(
      'SELECT store_id, store_name FROM stores WHERE store_id = ?',
      [storeIdInt]
    );

    if (stores.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Create chat room if not exists
    await dbPool.execute(
      `INSERT INTO chat_rooms (store_id, buyer_id, last_message_at) 
       VALUES (?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE last_message_at = last_message_at`,
      [storeIdInt, user.user_id]
    );

    res.json({ 
      success: true,
      room: {
        store_id: storeIdInt,
        buyer_id: user.user_id
      }
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
}

// upload image in chat
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = `/assets/images/chat/${req.file.filename}`;
    res.json({ image_url: imagePath });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

module.exports = {
  getChatRooms,
  getMessages,
  sendMessage,
  markAsRead,
  getStores,
  createChatRoom,
  uploadImage
};