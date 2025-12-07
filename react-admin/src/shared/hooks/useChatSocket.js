import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook untuk Chat WebSocket menggunakan Socket.IO
 */
export default function useChatSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host.replace(':5173', ':8080'); // Dev: replace vite port with nginx port
    
    const newSocket = io(`${protocol}//${host}`, {
      path: '/socket.io/',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Chat] WebSocket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('connected', (data) => {
      console.log('[Chat] Server confirmed connection:', data);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Chat] WebSocket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('[Chat] WebSocket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Join room
  const joinRoom = (storeId, buyerId) => {
    if (socket && connected) {
      socket.emit('join_room', { store_id: storeId, buyer_id: buyerId });
      setCurrentRoom({ store_id: storeId, buyer_id: buyerId });
      console.log('[Chat] Joined room:', storeId, buyerId);
    }
  };

  // Leave room
  const leaveRoom = () => {
    if (socket && connected && currentRoom) {
      socket.emit('leave_room', currentRoom);
      console.log('[Chat] Left room:', currentRoom);
      setCurrentRoom(null);
    }
  };

  // Send new message event
  const broadcastMessage = (storeId, buyerId, messageId) => {
    if (socket && connected) {
      socket.emit('new_message', {
        store_id: storeId,
        buyer_id: buyerId,
        message_id: messageId
      });
    }
  };

  // Send typing event
  const sendTyping = (storeId, buyerId, isTyping) => {
    if (socket && connected) {
      socket.emit('typing', {
        store_id: storeId,
        buyer_id: buyerId,
        is_typing: isTyping
      });
    }
  };

  // Mark as read
  const markAsRead = (storeId, buyerId) => {
    if (socket && connected) {
      socket.emit('mark_read', {
        store_id: storeId,
        buyer_id: buyerId
      });
    }
  };

  // Subscribe to events
  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  // Unsubscribe from events
  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  return {
    socket,
    connected,
    currentRoom,
    joinRoom,
    leaveRoom,
    broadcastMessage,
    sendTyping,
    markAsRead,
    on,
    off
  };
}
