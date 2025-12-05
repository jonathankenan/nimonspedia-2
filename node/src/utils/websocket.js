const WebSocket = require('ws');

const clients = new Set();

function initializeWebSocket(port = 3001) {
  const wss = new WebSocket.Server({ port });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    clients.add(ws);

    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to Nimonspedia WebSocket Server',
      timestamp: new Date().toISOString()
    }));

    // Handle messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received:', data);

        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          case 'auction_bid':
            // Broadcast bid to all connected clients
            broadcastMessage({
              type: 'auction_bid_update',
              auction_id: data.auction_id,
              current_price: data.current_price,
              bidder_name: data.bidder_name,
              timestamp: new Date().toISOString()
            });
            break;

          case 'chat':
            // Handle chat message (for future implementation)
            broadcastMessage({
              type: 'chat_message',
              sender_id: data.sender_id,
              content: data.content,
              timestamp: new Date().toISOString()
            });
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log(`WebSocket server running on port ${port}`);
  return wss;
}

function broadcastMessage(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

module.exports = { initializeWebSocket, broadcastMessage, clients };
