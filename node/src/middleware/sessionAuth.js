const dbPool = require('../config/db');
const redisClient = require('../config/redis');

/**
 * Verify PHP session cookie and extract user data
 * Session format in Redis: PHPREDIS_SESSION:{session_id}
 */
async function verifySession(sessionId) {
  if (!sessionId) {
    return null;
  }

  try {
    // Get session data from Redis (same format as PHP)
    const sessionKey = `PHPREDIS_SESSION:${sessionId}`;
    const sessionData = await redisClient.get(sessionKey);

    if (!sessionData) {
      console.log('Session not found in Redis:', sessionKey);
      return null;
    }

    // Parse PHP session format (key|serialized_value)
    const userData = parsePhpSession(sessionData);
    
    if (!userData || !userData.user_id) {
      console.log('Invalid session data');
      return null;
    }

    // Verify user exists and get full data
    const [users] = await dbPool.execute(
      'SELECT user_id, email, role, name FROM users WHERE user_id = ?',
      [userData.user_id]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Get store_id if user is a seller
    if (user.role === 'SELLER') {
      const [stores] = await dbPool.execute(
        'SELECT store_id FROM stores WHERE user_id = ?',
        [user.user_id]
      );
      if (stores.length > 0) {
        user.store_id = stores[0].store_id;
      }
    }

    return user;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Parse PHP session data format
 * PHP session format: key|serialized_value;key2|serialized_value2;
 */
function parsePhpSession(sessionString) {
  const userData = {};
  
  // Split by semicolon and process each key-value pair
  const pairs = sessionString.split(';').filter(p => p.trim());
  
  for (const pair of pairs) {
    const delimiterIndex = pair.indexOf('|');
    if (delimiterIndex === -1) continue;
    
    const key = pair.substring(0, delimiterIndex);
    const serializedValue = pair.substring(delimiterIndex + 1);
    
    // Parse serialized values
    const value = parsePhpSerializedValue(serializedValue);
    userData[key] = value;
  }
  
  return userData;
}

/**
 * Parse PHP serialized values
 * Supports: s:length:"string", i:integer, b:boolean
 */
function parsePhpSerializedValue(serialized) {
  if (!serialized) return null;
  
  // String: s:5:"hello"
  const stringMatch = serialized.match(/^s:\d+:"(.*)"/);
  if (stringMatch) {
    return stringMatch[1];
  }
  
  // Integer: i:123
  const intMatch = serialized.match(/^i:(\d+)/);
  if (intMatch) {
    return parseInt(intMatch[1]);
  }
  
  // Boolean: b:1 or b:0
  const boolMatch = serialized.match(/^b:([01])/);
  if (boolMatch) {
    return boolMatch[1] === '1';
  }
  
  return serialized;
}

/**
 * Extract session ID from cookie string
 */
function extractSessionId(cookieString) {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';').map(c => c.trim());
  
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'PHPSESSID') {
      return value;
    }
  }
  
  return null;
}

/**
 * WebSocket authentication middleware
 */
async function authenticateWebSocket(socket, next) {
  try {
    // Get session ID from cookie
    const cookieString = socket.handshake.headers.cookie;
    const sessionId = extractSessionId(cookieString);
    
    if (!sessionId) {
      return next(new Error('No session cookie provided'));
    }

    // Verify session
    const user = await verifySession(sessionId);
    
    if (!user) {
      return next(new Error('Invalid session'));
    }

    // Attach user data to socket
    socket.user = user;
    socket.sessionId = sessionId;
    
    console.log(`User authenticated: ${user.name} (${user.role}) - ID: ${user.user_id}`);
    next();
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    next(new Error('Authentication failed'));
  }
}

/**
 * Express middleware for REST API authentication
 */
async function authenticateRest(req, res, next) {
  try {
    const sessionId = req.cookies?.PHPSESSID;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await verifySession(sessionId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('REST authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = {
  verifySession,
  extractSessionId,
  authenticateWebSocket,
  authenticateRest
};
