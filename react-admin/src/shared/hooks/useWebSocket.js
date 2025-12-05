import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Custom hook untuk WebSocket connection
 * Untuk real-time auction bid updates
 */
export const useWebSocket = (url = 'ws://localhost:8080/ws') => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          console.log('WebSocket message received:', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [url]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    ws: wsRef.current
  };
};
